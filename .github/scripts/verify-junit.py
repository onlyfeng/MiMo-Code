#!/usr/bin/env python3

from collections import Counter
from pathlib import Path
import sys
import xml.etree.ElementTree as ElementTree


def fail(message: str) -> None:
    raise SystemExit(f"JUnit verification failed: {message}")


if len(sys.argv) < 3:
    fail("usage: verify-junit.py REPORT EXPECTED_FILE [EXPECTED_FILE ...]")

report = Path(sys.argv[1])
expected = sys.argv[2:]

try:
    root = ElementTree.parse(report).getroot()
except (OSError, ElementTree.ParseError) as error:
    fail(f"cannot parse {report}: {error}")

if root.tag != "testsuites":
    fail(f"unexpected root element {root.tag!r}")


def count(element: ElementTree.Element, name: str) -> int:
    value = element.get(name)
    if value is None:
        fail(f"<{element.tag}> is missing {name!r}")
    try:
        result = int(value)
    except ValueError:
        fail(f"<{element.tag}> has non-integer {name!r}: {value!r}")
    if result < 0:
        fail(f"<{element.tag}> has negative {name!r}: {value!r}")
    return result


def optional_count(element: ElementTree.Element, name: str) -> int:
    if element.get(name) is None:
        return 0
    return count(element, name)


tests = count(root, "tests")
skipped = count(root, "skipped")
failures = count(root, "failures")
errors = optional_count(root, "errors")
cases = root.findall(".//testcase")
case_skipped = sum(case.find("./skipped") is not None for case in cases)
case_failures = len(root.findall(".//failure"))
case_errors = len(root.findall(".//error"))

if tests != len(cases):
    fail(f"root tests={tests}, testcase elements={len(cases)}")
if skipped != case_skipped:
    fail(f"root skipped={skipped}, skipped testcase elements={case_skipped}")
if failures != case_failures:
    fail(f"root failures={failures}, failure elements={case_failures}")
if errors != case_errors:
    fail(f"root errors={errors}, error elements={case_errors}")
if failures or errors:
    fail(f"report records failures={failures}, errors={errors}")
if tests <= skipped:
    fail(f"no executed cases: tests={tests}, skipped={skipped}")

suites = root.findall("./testsuite")
actual = [suite.get("file") for suite in suites]
if any(file is None for file in actual):
    fail("a top-level testsuite is missing its file attribute")
if Counter(actual) != Counter(expected):
    missing = sorted((Counter(expected) - Counter(actual)).elements())
    extra = sorted((Counter(actual) - Counter(expected)).elements())
    fail(f"file coverage mismatch: missing={missing}, extra={extra}")
if len(actual) != len(set(actual)):
    fail("duplicate top-level testsuite file entries")
suite_tests = [count(suite, "tests") for suite in suites]
if any(value == 0 for value in suite_tests):
    fail("a reported top-level testsuite contains zero cases")
if sum(suite_tests) != tests:
    fail("top-level suite test totals do not match the root")
if sum(count(suite, "skipped") for suite in suites) != skipped:
    fail("top-level suite skipped totals do not match the root")
if sum(count(suite, "failures") for suite in suites) != failures:
    fail("top-level suite failure totals do not match the root")
if sum(optional_count(suite, "errors") for suite in suites) != errors:
    fail("top-level suite error totals do not match the root")

print(
    f"JUnit verified: files={len(actual)} tests={tests} "
    f"executed={tests - skipped} skipped={skipped}"
)
