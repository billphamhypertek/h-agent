from scripts.rebrand.engine import transform_text


def test_env_var_prefix():
    assert transform_text("HERMES_HOME") == "AETHER_HOME"
    assert transform_text("os.environ['HERMES_YOLO_MODE']") == "os.environ['AETHER_YOLO_MODE']"


def test_python_module_and_identifier():
    assert transform_text("from hermes_cli.main import main") == "from aether_cli.main import main"
    assert transform_text("get_hermes_home()") == "get_aether_home()"


def test_npm_scopes_and_packages():
    assert transform_text("@hermes-agent/photon-sidecar") == "@aether-agent/photon-sidecar"
    assert transform_text("@hermes/ink") == "@aether/ink"
    assert transform_text("hermes-tui") == "aether-tui"
    assert transform_text('"@hermes/ink": "file:./packages/hermes-ink"') == \
        '"@aether/ink": "file:./packages/aether-ink"'
    assert transform_text("pip install hermes-agent[cli]") == "pip install aether-agent[cli]"


def test_camelcase_identifiers_are_title_cased():
    # Code identifiers must become Aether*, NOT AETHER*.
    assert transform_text("class HermesCLI:") == "class AetherCLI:"
    assert transform_text("HermesTokenStorage") == "AetherTokenStorage"
    assert transform_text("HermesHome") == "AetherHome"


def test_display_wordmark_is_all_caps():
    assert transform_text("Welcome to Hermes Agent") == "Welcome to AETHER"
    assert transform_text("Hermes loads the config") == "AETHER loads the config"
    assert transform_text("Hermes Desktop") == "AETHER Desktop"
    assert transform_text("Hermes Protocol") == "AETHER"


def test_product_domain_replaced_provider_hosts_kept():
    assert transform_text("https://hermes-agent.nousresearch.com/install.sh") == \
        "https://aether.hypertek.vn/install.sh"
    assert transform_text("https://portal.nousresearch.com/v1") == \
        "https://portal.nousresearch.com/v1"
    assert transform_text("api.nousresearch.com") == "api.nousresearch.com"
    assert transform_text("https://openrouter.ai/api") == "https://openrouter.ai/api"


def test_scheme_and_data_dir():
    assert transform_text("hermes://callback") == "aether://callback"
    assert transform_text("~/.hermes/config.yaml") == "~/.aether/config.yaml"


def test_protected_model_names_survive():
    assert transform_text("Hermes 4") == "Hermes 4"
    assert transform_text("Hermes-3-Llama-3.1-405B") == "Hermes-3-Llama-3.1-405B"
    assert transform_text("nous-hermes") == "nous-hermes"
    assert transform_text("Nous Hermes") == "Nous Hermes"
    assert transform_text("NousResearch/Hermes-4-405B") == "NousResearch/Hermes-4-405B"


def test_protected_attribution_link_survives():
    assert transform_text("github.com/NousResearch/hermes-agent/issues") == \
        "github.com/NousResearch/hermes-agent/issues"
    # Case-insensitive on the repo segment (package.json uses Hermes-Agent).
    assert transform_text("github.com/NousResearch/Hermes-Agent.git") == \
        "github.com/NousResearch/Hermes-Agent.git"


def test_catch_all_lowercase_substring():
    assert transform_text("hermes-frames/hermes-frame-0.png") == \
        "aether-frames/aether-frame-0.png"
    assert transform_text("LOCALAPPDATA\\hermes") == "LOCALAPPDATA\\aether"


def test_idempotent():
    sample = (
        "from hermes_cli.main import main  # Hermes Agent, HermesCLI, "
        "HERMES_HOME, ~/.hermes, hermes-agent.nousresearch.com, "
        "NousResearch/hermes-agent, Hermes 4"
    )
    once = transform_text(sample)
    assert transform_text(once) == once
