#!/usr/bin/env python3
"""Independently verify compact inventory tuples against raw Git object diffs."""
import argparse
import concurrent.futures
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path, PurePosixPath

SCOPES = {'main': ('upstream', 'main'), 'compat': ('main', 'compat')}
COLUMNS = ('scope', 'path', 'status', 'before_mode', 'after_mode', 'before_blob', 'after_blob', 'additions', 'deletions')
IDENTITY = ('before_blob', 'before_mode', 'after_blob', 'after_mode')
ORIGINAL_RAW = ('scope', 'path', 'base', 'target', 'additions', 'deletions', *IDENTITY)
INHERITANCE = 'Identical blobs and modes for this same scope/path only; no new runtime or cross-file behavior proof.'
DISPOSITIONS = {'retain', 'revised', 'new_difference', 'aligned', 'promoted_to_main', 'partial_promotion', 'removed', 'mechanical', 'other'}
OPTIONS = ('--no-renames', '--no-ext-diff', '--no-textconv', '--ignore-submodules=none', '--diff-algorithm=myers')
BOUNDARIES = {
    'inheritance': 'Only identical same-scope/path before/after blobs and modes inherit prior semantic evidence. This is not fresh runtime or cross-file validation.',
    'original_records': 'original is a zero-based index into original_coverage.files. Its hash locks every prior raw tuple and semantic field without copying the original record.',
    'reviews': 'review indexes review_pool; approved means explicit attribution passed the format gate, not independent proof that the human judgment is correct.',
    'closing_documents': 'These snapshots contain all audited pairs without exclusions. Later closing-document commits are outside this snapshot; verify them separately with fixed published SHAs and an external explicit closing review. Never rewrite these SHAs to imply the report audits its own commit.',
}


def canonical(value):
    return json.dumps(value, ensure_ascii=True, sort_keys=True, separators=(',', ':'))


def sha256(value):
    return hashlib.sha256(value).hexdigest()


def digest(value):
    return sha256(canonical(value).encode())


def key(pair):
    return pair['scope'], pair['path']


def relative_path(value):
    if not isinstance(value, str) or not value or '\0' in value or value.startswith('/') or any(p in ('', '.', '..') for p in value.split('/')) or re.match(r'^[A-Za-z]:', value):
        raise ValueError('Expected a repository-relative path')
    return value


def check_portable(value):
    if isinstance(value, str):
        if re.search(r'(?:^|[\s\"\'(=])(?:/(?:Users|home|private|tmp|var/folders|Volumes|mnt)/|file://|[A-Za-z]:[\\/](?:Users|Temp)[\\/])', value):
            raise ValueError('Non-portable local path in artifact; replace it with an explicit published evidence reference before conversion')
    elif isinstance(value, dict):
        for k, v in value.items():
            check_portable(k)
            check_portable(v)
    elif isinstance(value, list):
        for v in value:
            check_portable(v)


def load_coverage(path, portable_path):
    relative_path(portable_path)
    raw = path.read_bytes()
    data = json.loads(raw)
    records = data['files']
    if len({key(p) for p in records}) != len(records):
        raise ValueError('Duplicate original coverage pair')
    for p in records:
        if p['scope'] not in SCOPES or any(name not in p for name in ORIGINAL_RAW):
            raise ValueError('Incomplete original pair')
        before, after = SCOPES[p['scope']]
        if p['base'] != data['snapshots'][before] or p['target'] != data['snapshots'][after]:
            raise ValueError('Original pair endpoints disagree with original snapshots')
    if counts(records) != data['comparison_counts']:
        raise ValueError('Original coverage summary differs from its records')
    return {'bytes': raw, 'data': data, 'portable_path': portable_path}


def counts(pairs):
    return {'upstream_to_main': sum(p['scope'] == 'main' for p in pairs),
            'main_to_compat': sum(p['scope'] == 'compat' for p in pairs),
            'pairs_total': len(pairs), 'unique_paths': len({p['path'] for p in pairs})}


def compact_summary(summary):
    result = dict(summary)
    result['reviewed_promotions_to_main'] = [{'scope': p['scope'], 'path': p['path']} for p in summary['reviewed_promotions_to_main']]
    return result


def validate_structure(data):
    if data.get('boundaries') != BOUNDARIES:
        raise ValueError('Required evidence and closing-document boundaries differ')
    if data.get('schema') != 'mimocode-compact-inventory/v1' or data.get('raw_columns') != list(COLUMNS):
        raise ValueError('Unsupported compact format or raw column layout')
    if data.get('comparisons') != {k: list(v) for k, v in SCOPES.items()}:
        raise ValueError('Comparison directions differ')
    if set(data['snapshots']) != {'upstream', 'main', 'compat'}:
        raise ValueError('Exactly three audited snapshots are required')
    relative_path(data['original_coverage']['path'])
    if not re.fullmatch('[0-9a-f]{64}', data['original_coverage']['sha256']):
        raise ValueError('Invalid coverage SHA256')
    for name in ('full_inventory_sha256', 'refresh_generator_sha256', 'compact_generator_sha256'):
        if not re.fullmatch('[0-9a-f]{64}', data['provenance'][name]):
            raise ValueError('Invalid provenance hash')
    seen, used = set(), set()
    for group in ('pairs', 'disappeared_pairs'):
        for item in data[group]:
            if group == 'pairs':
                if not isinstance(item['raw'], list) or len(item['raw']) != len(COLUMNS):
                    raise ValueError('Incomplete raw tuple')
                p = dict(zip(COLUMNS, item['raw']))
                if item['transition'] not in {'unchanged', 'changed', 'new'}:
                    raise ValueError('Current pair has invalid transition')
            else:
                p = item
                if item['transition'] != 'disappeared' or 'raw' in item:
                    raise ValueError('Disappeared pair has current raw data')
            relative_path(p['path'])
            if p['scope'] not in SCOPES or key(p) in seen:
                raise ValueError('Duplicate or unsupported pair')
            seen.add(key(p))
            index = item['review']
            if type(index) is not int or not 0 <= index < len(data['review_pool']):
                raise ValueError('Invalid review pool index')
            used.add(index)
            if item['original'] is not None and (type(item['original']) is not int or item['original'] < 0):
                raise ValueError('Invalid original record index')
    if used != set(range(len(data['review_pool']))):
        raise ValueError('Unused review pool entries')
    if len({canonical(r) for r in data['review_pool']}) != len(data['review_pool']):
        raise ValueError('Review pool contains duplicates')
    check_portable(data)


def explicit_review(review, closing=False):
    if review.get('status') == 'pending':
        return False
    if review.get('status') != 'approved':
        raise ValueError('Changed/new/disappeared entries require pending or explicit approved status')
    for name in ('reviewer', 'classification', 'summary'):
        if not isinstance(review.get(name), str) or not review[name].strip():
            raise ValueError('Approved review needs ' + name)
    for name in ('owners', 'evidence'):
        if not isinstance(review.get(name), list) or not review[name] or not all(isinstance(v, str) and v.strip() for v in review[name]):
            raise ValueError('Approved review needs nonempty ' + name)
    followups = review.get('followups', [])
    if not isinstance(followups, list) or any(not isinstance(v, str) or not re.fullmatch(r'F(?:0[1-9]|1[01])', v) for v in followups) or len(set(followups)) != len(followups):
        raise ValueError('Invalid followup attribution')
    if not followups and (not isinstance(review.get('outside_followups_reason'), str) or not review['outside_followups_reason'].strip()):
        raise ValueError('Approved review is unassigned')
    if closing:
        if review['classification'] != 'closing_documentation':
            raise ValueError('Closing delta requires an explicit closing_documentation review')
    elif review.get('disposition') not in DISPOSITIONS:
        raise ValueError('Approved review lacks disposition')
    return True


def decoded(data, item):
    if 'raw' not in item:
        return {'scope': item['scope'], 'path': item['path']}
    p = dict(zip(COLUMNS, item['raw']))
    before, after = SCOPES[p['scope']]
    p.update(base=data['snapshots'][before], target=data['snapshots'][after])
    return p


def check_reviews(data, coverage):
    prior_by_key = {key(p): (i, p) for i, p in enumerate(coverage['files'])}
    required, approved = 0, 0
    for item in data['pairs'] + data['disappeared_pairs']:
        p = decoded(data, item)
        prior = prior_by_key.get(key(p))
        if item['original'] != (prior[0] if prior else None):
            raise ValueError('Original record reference does not match scope/path')
        review = data['review_pool'][item['review']]
        expected = 'disappeared' if 'raw' not in item else 'new' if not prior else 'unchanged' if all(p[f] == prior[1][f] for f in IDENTITY) else 'changed'
        if item['transition'] != expected or (expected == 'disappeared' and not prior):
            raise ValueError('Transition cannot inherit evidence across changed raw blobs or modes')
        if item['transition'] == 'unchanged':
            if not prior or review != {'status': 'inherited', 'owners': prior[1]['owners'], 'boundary': INHERITANCE}:
                raise ValueError('Inherited evidence may not silently change owner or claim fresh review')
        else:
            required += 1
            approved += explicit_review(review)
    gate = {'passed': required == approved, 'required': required, 'approved': approved, 'pending': required - approved}
    if data['summary']['review_gate'] != gate:
        raise ValueError('Review gate summary differs from explicit reviews')
    return gate


def git(repo, *args):
    result = subprocess.run(['git', '-C', str(repo), *args], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode:
        raise ValueError('Git verification failed: ' + result.stderr.decode(errors='replace').strip())
    return result.stdout


def commit(repo, value):
    if not isinstance(value, str) or not re.fullmatch(r'(?:[0-9a-f]{40}|[0-9a-f]{64})', value):
        raise ValueError('Require full lowercase immutable commit IDs')
    if git(repo, 'rev-parse', '--verify', value + '^{commit}').decode().strip() != value:
        raise ValueError('Snapshot must name a commit, not a tag object')
    return value


def raw_diff(repo, scope, before, after):
    # Deliberately independent of refresh_inventory.enumerate_pairs.
    fields = git(repo, 'diff', *OPTIONS, '--raw', '-z', '--no-abbrev', before, after, '--').split(b'\0')
    if fields.pop() != b'' or len(fields) % 2:
        raise ValueError('Malformed NUL-separated raw diff')
    result = {}
    for i in range(0, len(fields), 2):
        header = re.fullmatch(rb':([0-7]{6}) ([0-7]{6}) ([0-9a-f]+) ([0-9a-f]+) ([AMDT])', fields[i])
        if not header:
            raise ValueError('Unexpected raw Git header')
        bm, am, bb, ab, status = [v.decode('ascii') for v in header.groups()]
        path = fields[i + 1].decode('utf-8', 'surrogateescape')
        if path in result:
            raise ValueError('Duplicate Git raw path')
        result[path] = {'scope': scope, 'path': path, 'base': before, 'target': after, 'status': status,
                        'before_mode': None if bm == '000000' else bm, 'after_mode': None if am == '000000' else am,
                        'before_blob': None if not bb.strip('0') else bb, 'after_blob': None if not ab.strip('0') else ab}
    seen = set()
    for row in git(repo, 'diff', *OPTIONS, '--numstat', '-z', before, after, '--').split(b'\0'):
        if not row:
            continue
        plus, minus, encoded = row.split(b'\t', 2)
        path = encoded.decode('utf-8', 'surrogateescape')
        if path not in result or path in seen or any(v != b'-' and not v.isdigit() for v in (plus, minus)):
            raise ValueError('Raw and numstat paths/counts disagree')
        result[path].update(additions=plus.decode(), deletions=minus.decode())
        seen.add(path)
    if seen != set(result):
        raise ValueError('Missing numstat records')
    return list(result.values())


def tree(repo, sha):
    result = {}
    for row in git(repo, 'ls-tree', '-r', '--full-tree', '-z', sha).split(b'\0'):
        if not row:
            continue
        info, path = row.split(b'\t', 1)
        mode, _, blob = info.decode('ascii').split()
        result[path.decode('utf-8', 'surrogateescape')] = {'mode': mode, 'blob': blob}
    return result


def verify_full(data, full_bytes, coverage):
    if sha256(full_bytes) != data['provenance']['full_inventory_sha256']:
        raise ValueError('Full inventory provenance hash differs')
    full = json.loads(full_bytes)
    if full['generator_sha256'] != data['provenance']['refresh_generator_sha256']:
        raise ValueError('Refresh generator provenance differs from full inventory')
    if data['snapshots'] != full['snapshots'] or data['summary'] != compact_summary(full['summary']):
        raise ValueError('Conversion lost snapshot or summary information')
    for group in ('pairs', 'disappeared_pairs'):
        compact = {key(decoded(data, p)): p for p in data[group]}
        source = {key(p): p for p in full[group]}
        if set(compact) != set(source):
            raise ValueError('Conversion lost or added entries')
        for k, item in compact.items():
            prior = source[k]
            actual = decoded(data, item)
            if any(actual[f] != prior[f] for f in actual):
                raise ValueError('Conversion changed a raw tuple')
            if item['transition'] != prior['transition'] or item['fingerprint'] != prior['fingerprint'] or data['review_pool'][item['review']] != prior['review']:
                raise ValueError('Conversion changed semantic review or transition history')
            if item['original'] is not None and coverage['files'][item['original']] != prior['original_evidence']['record']:
                raise ValueError('Conversion lost original semantic evidence')
    return True


def verify(data, repo, coverage):
    validate_structure(data)
    if sha256(coverage['bytes']) != data['original_coverage']['sha256'] or coverage['data']['snapshots'] != data['original_coverage']['snapshots']:
        raise ValueError('Source coverage identity differs')
    snapshots = {k: commit(repo, v) for k, v in data['snapshots'].items()}
    original_snapshots = {k: commit(repo, coverage['data']['snapshots'][k]) for k in snapshots}
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        fresh_jobs = [pool.submit(raw_diff, repo, s, snapshots[b], snapshots[a]) for s, (b, a) in SCOPES.items()]
        old_jobs = [pool.submit(raw_diff, repo, s, original_snapshots[b], original_snapshots[a]) for s, (b, a) in SCOPES.items()]
        trees = {k: pool.submit(tree, repo, sha) for k, sha in snapshots.items()}
        fresh = {key(p): p for job in fresh_jobs for p in job.result()}
        old_git = {key(p): p for job in old_jobs for p in job.result()}
        trees = {k: job.result() for k, job in trees.items()}
    old = {key(p): p for p in coverage['data']['files']}
    if set(old) != set(old_git) or any(any(p[f] != old_git[k][f] for f in ORIGINAL_RAW) for k, p in old.items()):
        raise ValueError('Original coverage does not exactly reconstruct from its Git snapshots')
    actual = {key(decoded(data, p)): decoded(data, p) for p in data['pairs']}
    if actual != fresh:
        missing, extra = sorted(set(fresh) - set(actual)), sorted(set(actual) - set(fresh))
        changed = sorted(k for k in set(actual) & set(fresh) if actual[k] != fresh[k])
        raise ValueError('Current raw tuples differ from Git: ' + canonical({'missing': missing[:8], 'extra': extra[:8], 'changed': changed[:8]}))
    if {key(p) for p in data['disappeared_pairs']} != set(old) - set(fresh):
        raise ValueError('Disappeared pair history is incomplete')
    gate = check_reviews(data, coverage['data'])
    transitions = {s: 0 for s in ('unchanged', 'changed', 'new', 'disappeared')}
    promotions = []
    for item in data['pairs'] + data['disappeared_pairs']:
        p = decoded(data, item)
        prior, current = old.get(key(p)), fresh.get(key(p))
        state = 'disappeared' if current is None else 'new' if prior is None else 'unchanged' if all(prior[f] == current[f] for f in IDENTITY) else 'changed'
        fingerprint = digest({'scope': p['scope'], 'path': p['path'], 'transition': state, 'snapshots': snapshots,
                              'original': {f: prior[f] for f in ORIGINAL_RAW} if prior else None, 'current': current})
        if item['transition'] != state or item['fingerprint'] != fingerprint:
            raise ValueError('Transition or snapshot-bound review fingerprint differs from raw Git facts')
        transitions[state] += 1
        review = data['review_pool'][item['review']]
        if review.get('disposition') == 'promoted_to_main':
            values = [trees[name].get(p['path']) for name in ('upstream', 'main', 'compat')]
            if review['status'] != 'approved' or p['scope'] != 'compat' or state != 'disappeared' or values[1] != values[2] or values[0] == values[1]:
                raise ValueError('Promotion lacks explicit approval or required Git endpoint equality')
            promotions.append({'scope': p['scope'], 'path': p['path']})
    old_paths = {k[1] for k in old}
    new_paths = {k[1] for k in fresh}
    shared = sorted(path for path in old_paths | new_paths if trees['main'].get(path) == trees['compat'].get(path) and trees['upstream'].get(path) != trees['main'].get(path))
    summary = {'original_counts': counts(list(old.values())), 'current_counts': counts(list(fresh.values())),
               'pair_transitions': transitions, 'paths_disappeared_from_diff': sorted(old_paths - new_paths),
               'paths_new_to_diff': sorted(new_paths - old_paths), 'shared_fork_byte_difference_paths': shared,
               'reviewed_promotions_to_main': sorted(promotions, key=key), 'review_gate': gate}
    if data['summary'] != summary:
        raise ValueError('Summary differs from independently reconstructed counts/history/reviews')
    return {'raw_git_verified': True, 'original_git_verified': True, 'snapshots': snapshots, 'summary': summary,
            'semantic_boundary': 'Review fields and attribution are preserved and format-checked; Git equality does not prove the human semantic judgments or runtime behavior.'}


def closing_delta(repo, data, review):
    if review.get('schema') != 1 or review['audited_snapshots'] != data['snapshots'] or set(review['published_snapshots']) != set(data['snapshots']) or set(review['paths']) != set(data['snapshots']):
        raise ValueError('Closing review must bind the exact audited and published triples')
    check_portable(review)
    approved = explicit_review(review['review'], closing=True)
    rows = []
    for endpoint, audited in data['snapshots'].items():
        published = commit(repo, review['published_snapshots'][endpoint])
        if subprocess.run(['git', '-C', str(repo), 'merge-base', '--is-ancestor', audited, published], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE).returncode:
            raise ValueError('Published endpoint is not a descendant of its audited snapshot')
        paths = review['paths'][endpoint]
        if not isinstance(paths, list) or len(paths) != len(set(paths)):
            raise ValueError('Closing path allowlist must be explicit and unique')
        for path in paths:
            relative_path(path)
            if not path.startswith('docs/') or PurePosixPath(path).suffix not in ('.md', '.json', '.txt'):
                raise ValueError('Closing delta may contain only explicitly reviewed documentation data paths')
        delta = raw_diff(repo, endpoint, audited, published)
        if sorted(paths) != sorted(p['path'] for p in delta):
            raise ValueError('Closing delta has missing or unlisted files')
        for p in delta:
            if p['before_mode'] not in (None, '100644') or p['after_mode'] not in (None, '100644') or p['additions'] == '-' or p['deletions'] == '-':
                raise ValueError('Closing delta contains executable, symlink, submodule or binary data')
        rows.extend(delta)
    return {'passed': approved, 'audited_snapshots': data['snapshots'], 'published_snapshots': review['published_snapshots'],
            'rows': rows, 'review': review['review'],
            'boundary': 'External attestation only: these later documentation changes are not part of the audited inventory and do not retroactively change its snapshots. The allowlist is a structural gate; documentation-only semantics require the explicit human review.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', required=True)
    parser.add_argument('--artifact', required=True)
    parser.add_argument('--coverage', help='Override local source coverage location; its hash must still match')
    parser.add_argument('--full-inventory', help='Additionally prove projection retained every original raw/review/history field')
    parser.add_argument('--closing-review', help='External review binding later published SHAs and explicit docs-only paths')
    args = parser.parse_args()
    try:
        data = json.loads(Path(args.artifact).read_bytes())
        source = Path(args.coverage) if args.coverage else Path(args.repo) / data['original_coverage']['path']
        coverage = load_coverage(source, data['original_coverage']['path'])
        result = verify(data, Path(args.repo), coverage)
        if args.full_inventory:
            result['lossless_projection_verified'] = verify_full(data, Path(args.full_inventory).read_bytes(), coverage['data'])
        if args.closing_review:
            result['closing_delta'] = closing_delta(Path(args.repo), data, json.loads(Path(args.closing_review).read_bytes()))
        print(json.dumps(result, ensure_ascii=True, indent=2))
        return 0 if result['summary']['review_gate']['passed'] and result.get('closing_delta', {}).get('passed', True) else 2
    except (ValueError, KeyError, IndexError, TypeError, OSError) as error:
        print(f'compact verification error: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
