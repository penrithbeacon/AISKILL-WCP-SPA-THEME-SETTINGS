"""
Contract tests for WCP SPA Theme Settings.

This skill's real logic is browser JS/CSS/HTML, not Python -- these tests don't execute
that logic (that would need a browser runtime), but they do verify the static contracts
that logic depends on: every onclick handler referenced in a template is actually defined
in a script, every literal element id a script looks up actually exists in a template, and
the bundled .wcpt seasonal collections are well-formed and internally consistent.
"""
import json
import re
import zipfile
from pathlib import Path

ASSETS = Path(__file__).resolve().parents[1]
SCRIPTS = ASSETS / "scripts"
TEMPLATES = ASSETS / "templates"
THEMES = ASSETS / "themes"

EXPECTED_WCPT_FILES = [
    "wcp-theme-collection-seasons-spring-d9f2581e-f063-4a15-baf8-e6cce8ba609b.wcpt",
    "wcp-theme-collection-seasons-summer-4e27a6db-1044-4eca-aa83-13166ef8f54e.wcpt",
    "wcp-theme-collection-seasons-autumn-c5e9bbcd-3ece-4bef-8b6c-98f53a0cf671.wcpt",
    "wcp-theme-collection-seasons-winter-4101d760-bcb8-4d1b-8a80-38ba6a1b736a.wcpt",
]


def all_script_text():
    return "\n".join(p.read_text() for p in SCRIPTS.glob("*.js"))


def all_template_text():
    return "\n".join(p.read_text() for p in TEMPLATES.glob("*.html"))


class TestOnclickHandlersAreDefined:
    def test_every_onclick_function_is_defined_in_scripts(self):
        html = all_template_text()
        js = all_script_text()
        called = set(re.findall(r'onclick="(wcp[A-Za-z]+)\(', html))
        assert called, "expected at least one onclick=\"wcpX(...)\" handler in the templates"
        defined = set(re.findall(r"window\.(wcp[A-Za-z]+)\s*=", js))
        missing = called - defined
        assert not missing, f"onclick handlers with no window.<fn> definition: {missing}"


class TestReferencedElementIdsExist:
    LITERAL_ID_PATTERN = re.compile(r"getElementById\('([a-zA-Z0-9-]+)'\)")

    def test_literal_getelementbyid_targets_exist_in_templates(self):
        js = all_script_text()
        html = all_template_text()
        referenced = set(self.LITERAL_ID_PATTERN.findall(js))
        assert referenced, "expected at least one literal getElementById('...') call"
        for element_id in referenced:
            assert f'id="{element_id}"' in html, (
                f"script references getElementById('{element_id}') "
                f"but no template defines id=\"{element_id}\""
            )


class TestSeasonalCollections:
    def test_all_four_expected_wcpt_files_present(self):
        actual = {p.name for p in THEMES.glob("*.wcpt")}
        expected = set(EXPECTED_WCPT_FILES)
        assert actual == expected, f"expected {expected}, found {actual}"

    def test_each_wcpt_is_a_valid_zip_with_manifest_and_themes(self):
        for filename in EXPECTED_WCPT_FILES:
            path = THEMES / filename
            with zipfile.ZipFile(path) as z:
                names = z.namelist()
                assert "manifest.json" in names, f"{filename} is missing manifest.json"
                assert "themes.json" in names, f"{filename} is missing themes.json"

    def test_manifest_theme_count_matches_themes_json_length(self):
        for filename in EXPECTED_WCPT_FILES:
            path = THEMES / filename
            with zipfile.ZipFile(path) as z:
                manifest = json.loads(z.read("manifest.json"))
                themes = json.loads(z.read("themes.json"))
                assert manifest["themeCount"] == len(themes), (
                    f"{filename}: manifest.themeCount={manifest['themeCount']} "
                    f"but themes.json has {len(themes)} entries"
                )

    def test_manifest_format_is_wcpt(self):
        for filename in EXPECTED_WCPT_FILES:
            path = THEMES / filename
            with zipfile.ZipFile(path) as z:
                manifest = json.loads(z.read("manifest.json"))
                assert manifest["format"] == "wcpt"

    def test_every_theme_entry_has_required_fields(self):
        required = {"id", "uuid", "name", "vars"}
        for filename in EXPECTED_WCPT_FILES:
            path = THEMES / filename
            with zipfile.ZipFile(path) as z:
                themes = json.loads(z.read("themes.json"))
                for theme in themes:
                    missing = required - set(theme.keys())
                    assert not missing, f"{filename}: theme {theme.get('name')} missing {missing}"
                    assert theme["id"] == theme["uuid"], (
                        f"{filename}: theme {theme['name']} has id != uuid "
                        f"({theme['id']} != {theme['uuid']})"
                    )
                    assert isinstance(theme["vars"], dict) and theme["vars"], (
                        f"{filename}: theme {theme['name']} has empty vars"
                    )


class TestCssTokenDefaults:
    def test_token_defaults_file_defines_primary_colour_token(self):
        css = (TEMPLATES / "css-wcp-token-defaults.css").read_text()
        # --wcp-color-primary is explicitly documented (SKILL.md Step 2) as the customisation
        # point for a target brand -- if it's missing, the documented instructions are wrong.
        assert re.search(r"--wcp-color-primary\s*:", css), (
            "css-wcp-token-defaults.css does not define --wcp-color-primary, "
            "but SKILL.md Step 2 documents it as the brand customisation point"
        )

    def test_token_defaults_are_declared_inside_root_block(self):
        css = (TEMPLATES / "css-wcp-token-defaults.css").read_text()
        assert ":root" in css, "expected a :root {} block declaring --wcp-* fallback tokens"
