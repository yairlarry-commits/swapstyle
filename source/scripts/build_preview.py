"""Bundle the src/ files into one HTML page (React + Babel from CDN) for a quick preview.
Runs in demo mode (no Supabase). Usage: python3 scripts/build_preview.py out.html"""
import re, sys, pathlib, json

root = pathlib.Path(__file__).resolve().parent.parent
order = [
    "src/lib/constants.js", "src/lib/backend.js", "src/lib/demoStore.js", "src/lib/api.js",
    "src/lib/sounds.js", "src/lib/imageClean.js",
    "src/context/RouterContext.jsx", "src/context/AuthContext.jsx",
    "src/components/ui.jsx",
    "src/screens/AuthScreen.jsx", "src/screens/FeedScreen.jsx", "src/screens/ItemScreen.jsx",
    "src/screens/ProfileScreen.jsx", "src/screens/CameraFlow.jsx", "src/screens/UploadScreen.jsx",
    "src/screens/OffersScreen.jsx", "src/App.jsx",
]
react_names, lucide_names, chunks = set(), {}, []
imp = re.compile(r"^import\s+(?:(\w+)\s*,?\s*)?(?:\{([^}]*)\})?\s*(?:from\s+)?['\"]([^'\"]+)['\"];?\s*$", re.M)
for rel in order:
    src = (root / rel).read_text()
    for m in imp.finditer(src):
        default, named, mod = m.group(1), m.group(2) or "", m.group(3)
        names = [n.strip() for n in named.split(",") if n.strip()]
        if mod == "react":
            react_names.update(names)
        elif mod == "lucide-react":
            for n in names:
                parts = [p.strip() for p in n.split(" as ")]
                lucide_names[parts[-1]] = parts[0]
    src = imp.sub("", src)
    src = src.replace("import.meta.env", "(window.__ENV || {})")
    src = re.sub(r"^export default function", "function", src, flags=re.M)
    src = re.sub(r"^export\s+", "", src, flags=re.M)
    chunks.append(f"// ---- {rel} ----\n{src}")

theme_js = (root / "tailwind.theme.js").read_text().split("export const theme =", 1)[1].strip().rstrip(";")
css = (root / "src/index.css").read_text().replace("@tailwind base;\n@tailwind components;\n@tailwind utilities;\n", "")
lucide_decl = ", ".join(k if k == v else f"{v}: {k}" for k, v in sorted(lucide_names.items()))
body = "\n".join(chunks)
app = f"""const {{ {', '.join(sorted(react_names))} }} = React;
const {{ createRoot }} = ReactDOM;
const createClient = null;
const {{ {lucide_decl} }} = LucideReact;
{body}
createRoot(document.getElementById('root')).render(<App />);
"""
html = f"""<title>SwapStyle</title>
<meta name="theme-color" content="#000000">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com/3.4.17"></script>
<script>tailwind.config = {{ theme: {theme_js} }};</script>
<style>
{css}
</style>
<div id="root"><div style="min-height:100vh;display:grid;place-items:center;background:#0f0f12;color:#8b8b97;font:500 12px Inter,system-ui,sans-serif">Loading SwapStyle…</div></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/lucide-react@0.446.0/dist/umd/lucide-react.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.26.4/babel.min.js"></script>
<script type="text/babel" data-presets="react">
{app}
</script>
"""
out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else root / "preview.html")
out.write_text(html)
print("wrote", out, len(html), "bytes; lucide:", len(lucide_names), "react:", sorted(react_names))
