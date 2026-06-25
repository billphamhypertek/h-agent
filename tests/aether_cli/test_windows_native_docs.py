from pathlib import Path


def test_windows_native_install_path_docs_match_installer() -> None:
    doc = Path("website/docs/user-guide/windows-native.md").read_text()
    install = Path("scripts/install.ps1").read_text()

    assert "%LOCALAPPDATA%\\aether\\aether-agent\\venv\\Scripts" in doc
    assert "Get-Command aether        # should print C:\\Users\\<you>\\AppData\\Local\\aether\\aether-agent\\venv\\Scripts\\aether.exe" in doc
    assert '$aetherBin = "$InstallDir\\venv\\Scripts"' in install
