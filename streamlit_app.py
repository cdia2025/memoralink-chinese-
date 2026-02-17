
import streamlit as st
import os
import re

# Configuration
st.set_page_config(
    layout="wide", 
    page_title="MemoraLink Chinese System",
    page_icon="🧠"
)

def get_secret(key):
    """
    Safely get secret from environment (Render) or Streamlit secrets (Local).
    Prevents FileNotFoundError on Render.
    """
    # 1. Check Environment Variables (Render/Docker)
    if key in os.environ:
        return os.environ[key]
    
    # 2. Check Streamlit Secrets (Local Dev)
    try:
        # Accessing st.secrets triggers a FileNotFoundError if the file doesn't exist
        # so we wrap it in a try/except block.
        return st.secrets.get(key, "")
    except FileNotFoundError:
        return ""
    except Exception:
        return ""

def load_react_app():
    # The React build output directory
    build_dir = os.path.join(os.path.dirname(__file__), "dist")
    assets_dir = os.path.join(build_dir, "assets")
    
    if not os.path.exists(build_dir):
        st.error("React build not found. If you are on Render, ensure the Dockerfile built it correctly.")
        return

    index_path = os.path.join(build_dir, "index.html")
    
    if not os.path.exists(index_path):
        st.error("index.html not found in dist folder.")
        return

    # Read the index.html content
    with open(index_path, "r", encoding="utf-8") as f:
        html_content = f.read()

    # --- ASSET INLINING START ---
    # Streamlit components won't serve local ./assets/file.js automatically.
    # We read the JS/CSS files and inject them directly into the HTML to ensure 100% portability.

    # 1. Inject CSS
    if os.path.exists(assets_dir):
        css_files = [f for f in os.listdir(assets_dir) if f.endswith(".css")]
        for css_file in css_files:
            css_path = os.path.join(assets_dir, css_file)
            with open(css_path, "r", encoding="utf-8") as f:
                css_content = f.read()
            pattern = re.compile(f'<link[^>]+href="[^"]*{re.escape(css_file)}"[^>]*>', re.IGNORECASE)
            html_content = pattern.sub(lambda m: f"<style>{css_content}</style>", html_content)

        # 2. Inject JS
        js_files = [f for f in os.listdir(assets_dir) if f.endswith(".js")]
        for js_file in js_files:
            js_path = os.path.join(assets_dir, js_file)
            with open(js_path, "r", encoding="utf-8") as f:
                js_content = f.read()
            pattern = re.compile(f'<script[^>]+src="[^"]*{re.escape(js_file)}"[^>]*>[\s\S]*?</script>', re.IGNORECASE)
            html_content = pattern.sub(lambda m: f'<script type="module">{js_content}</script>', html_content)
    # --- ASSET INLINING END ---

    # --- KEY INJECTION START ---
    # We use the safe get_secret helper here
    gemini_key = get_secret("API_KEY")
    deepseek_key = get_secret("DEEPSEEK_API_KEY")

    # Inject the keys into the window object so React can read them
    injection_script = f"""
    <script>
        window.DEEPSEEK_API_KEY = "{deepseek_key}";
        window.API_KEY = "{gemini_key}";
    </script>
    """
    html_content = html_content.replace("</head>", f"{injection_script}</head>")
    # --- KEY INJECTION END ---

    # Render the App
    st.components.v1.html(html_content, height=1000, scrolling=True)

# Run the loader
if __name__ == "__main__":
    load_react_app()
