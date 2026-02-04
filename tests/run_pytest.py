import pytest
import sys

code = pytest.main(["-q", "-rA"])
with open("/tmp/pytest_exit_code", "w") as f:
    f.write(str(code))
print("pytest exit code:", code)
