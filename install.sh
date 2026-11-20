#!/usr/bin/env bash
# CP Graph Editor — Universal 1-Click Installer for Linux & macOS
# Usage: curl -fsSL https://raw.githubusercontent.com/graph-editor/graph-editor.github.io/master/install.sh | bash

set -e

REPO="graph-editor/graph-editor.github.io"
TAG="v2.1.0"
OS="$(uname -s)"
ARCH="$(uname -m)"

echo "🚀 Installing CP Graph Editor ($TAG) for $OS ($ARCH)..."

if [ "$OS" = "Linux" ]; then
    BIN_DIR="$HOME/.local/bin"
    APP_DIR="$HOME/.local/opt/cp-graph-editor"
    DESKTOP_DIR="$HOME/.local/share/applications"
    ICON_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"

    mkdir -p "$BIN_DIR" "$APP_DIR" "$DESKTOP_DIR" "$ICON_DIR"

    TEMP_DEB="/tmp/cp-graph-editor.deb"
    TEMP_EXTRACT="/tmp/cp-graph-editor-extract"

    echo "📥 Downloading lightweight native package (7.3 MB)..."
    curl -fL -# -o "$TEMP_DEB" "https://github.com/$REPO/releases/download/$TAG/CP.Graph.Editor_2.0.0_amd64.deb"

    echo "📦 Unpacking application..."
    rm -rf "$TEMP_EXTRACT"
    mkdir -p "$TEMP_EXTRACT"
    dpkg-deb -x "$TEMP_DEB" "$TEMP_EXTRACT" 2>/dev/null || ar p "$TEMP_DEB" data.tar.xz | tar -xJ -C "$TEMP_EXTRACT"

    cp "$TEMP_EXTRACT/usr/bin/cp-graph-editor" "$APP_DIR/cp-graph-editor"
    chmod +x "$APP_DIR/cp-graph-editor"

    # Install icon
    if [ -f "$TEMP_EXTRACT/usr/share/icons/hicolor/512x512/apps/cp-graph-editor.png" ]; then
        cp "$TEMP_EXTRACT/usr/share/icons/hicolor/512x512/apps/cp-graph-editor.png" "$ICON_DIR/cp-graph-editor.png"
    fi

    # Create launcher
    cat <<'EOF' > "$BIN_DIR/cp-graph-editor"
#!/usr/bin/env bash
exec "$HOME/.local/opt/cp-graph-editor/cp-graph-editor" "$@"
EOF
    chmod +x "$BIN_DIR/cp-graph-editor"

    # Create desktop shortcut
    cat <<EOF > "$DESKTOP_DIR/cp-graph-editor.desktop"
[Desktop Entry]
Name=CP Graph Editor
Comment=Ultra-clean Graph Visualizer & Editor tailored for Competitive Programming
Exec=$BIN_DIR/cp-graph-editor %U
Terminal=false
Type=Application
Icon=cp-graph-editor
Categories=Development;Education;
StartupWMClass=cp-graph-editor
EOF

    rm -rf "$TEMP_DEB" "$TEMP_EXTRACT"

    echo "✅ CP Graph Editor installed successfully to $APP_DIR/cp-graph-editor!"
    echo "🎉 Launching application..."
    nohup "$BIN_DIR/cp-graph-editor" >/dev/null 2>&1 &

elif [ "$OS" = "Darwin" ]; then
    TARGET_DIR="/Applications"
    if [ ! -w "$TARGET_DIR" ]; then
        TARGET_DIR="$HOME/Applications"
        mkdir -p "$TARGET_DIR"
    fi

    TEMP_TAR="/tmp/cp-graph-editor-mac.tar.gz"
    echo "📥 Downloading universal macOS bundle (14 MB)..."
    curl -fL -# -o "$TEMP_TAR" "https://github.com/$REPO/releases/download/$TAG/CP.Graph.Editor_universal.app.tar.gz"

    echo "📦 Installing into $TARGET_DIR..."
    tar -xzf "$TEMP_TAR" -C "$TARGET_DIR"
    rm -f "$TEMP_TAR"

    echo "✅ CP Graph Editor installed into $TARGET_DIR/CP Graph Editor.app!"
    echo "🎉 Launching application..."
    open -a "$TARGET_DIR/CP Graph Editor.app"

else
    echo "❌ Unsupported operating system: $OS"
    exit 1
fi
