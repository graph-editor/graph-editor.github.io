#!/usr/bin/env python3
"""
Custom dmgbuild replacement for electron-builder running on Linux.
Generates genuine Apple UDIF (.dmg) disk images using genisoimage and dmg_tool.
"""

import sys
import os
import json
import shutil
import tempfile
import subprocess

def main():
    args = sys.argv[1:]
    settings_file = None
    volume_name = None
    artifact_path = None
    
    i = 0
    positionals = []
    while i < len(args):
        if args[i] == "-s" and i + 1 < len(args):
            settings_file = args[i + 1]
            i += 2
        elif args[i].startswith("-"):
            i += 1
        else:
            positionals.append(args[i])
            i += 1
            
    if len(positionals) >= 2:
        volume_name = positionals[0]
        artifact_path = positionals[1]
    elif len(positionals) == 1:
        artifact_path = positionals[0]
        volume_name = "CP Graph Editor"
    else:
        sys.stderr.write("Usage: dmgbuild-linux.py -s <settings.json> <volumeName> <artifactPath>\n")
        sys.exit(1)
        
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, ".."))
    
    genisoimage_bin = os.path.join(project_root, "build", "bin", "genisoimage")
    dmg_tool_bin = os.path.join(project_root, "build", "bin", "dmg_tool")
    
    if not os.path.exists(genisoimage_bin):
        genisoimage_bin = shutil.which("genisoimage") or shutil.which("mkisofs")
    if not os.path.exists(dmg_tool_bin):
        dmg_tool_bin = shutil.which("dmg_tool")
        
    if not genisoimage_bin or not os.path.exists(genisoimage_bin):
        sys.stderr.write(f"Error: genisoimage not found at {genisoimage_bin}\n")
        sys.exit(1)

    contents = []
    if settings_file and os.path.exists(settings_file):
        try:
            with open(settings_file, "r", encoding="utf-8") as f:
                settings = json.load(f)
                contents = settings.get("contents", [])
                if not volume_name and settings.get("title"):
                    volume_name = settings["title"]
        except Exception as e:
            sys.stderr.write(f"Warning: could not read settings file: {e}\n")

    staging_dir = tempfile.mkdtemp(prefix="dmg-stage-")
    temp_raw_dmg = os.path.join(tempfile.gettempdir(), f"raw-{os.path.basename(artifact_path)}")
    
    try:
        # Populate staging directory
        for item in contents:
            item_type = item.get("type", "file")
            item_path = item.get("path")
            item_name = item.get("name")
            
            if item_type == "link":
                target = item_path or "/Applications"
                link_name = item_name or os.path.basename(target.rstrip("/"))
                dest = os.path.join(staging_dir, link_name)
                if not os.path.exists(dest):
                    os.symlink(target, dest)
            elif item_type in ("file", "dir") and item_path:
                dest_name = item_name or os.path.basename(item_path.rstrip("/"))
                dest = os.path.join(staging_dir, dest_name)
                if os.path.isdir(item_path):
                    if os.path.exists(dest):
                        shutil.rmtree(dest)
                    shutil.copytree(item_path, dest, symlinks=True)
                elif os.path.isfile(item_path):
                    shutil.copy2(item_path, dest)
                    
        # Verify app bundle is in staging
        app_bundles = [d for d in os.listdir(staging_dir) if d.endswith(".app")]
        if not app_bundles:
            # Fallback: find .app in release/mac or dist
            mac_dir = os.path.join(project_root, "release", "mac")
            if os.path.exists(mac_dir):
                for candidate in os.listdir(mac_dir):
                    if candidate.endswith(".app"):
                        shutil.copytree(os.path.join(mac_dir, candidate), os.path.join(staging_dir, candidate), symlinks=True)
                        break

        # Always ensure /Applications symlink exists for drag & drop
        app_link = os.path.join(staging_dir, "Applications")
        if not os.path.exists(app_link) and not os.path.islink(app_link):
            os.symlink("/Applications", app_link)

        # Build raw ISO/HFS hybrid image with genisoimage
        iso_cmd = [
            genisoimage_bin,
            "-V", volume_name or "CP Graph Editor",
            "-D", "-R", "-apple", "-no-pad",
            "-o", temp_raw_dmg,
            staging_dir
        ]
        res = subprocess.run(iso_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            sys.stderr.write(f"genisoimage failed:\n{res.stderr}\n")
            sys.exit(res.returncode)

        os.makedirs(os.path.dirname(os.path.abspath(artifact_path)), exist_ok=True)
        
        # If dmg_tool is available, convert to compressed Apple UDIF (.dmg) with koly trailer
        if dmg_tool_bin and os.path.exists(dmg_tool_bin):
            dmg_cmd = [dmg_tool_bin, "dmg", temp_raw_dmg, artifact_path]
            dmg_res = subprocess.run(dmg_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if dmg_res.returncode == 0 and os.path.exists(artifact_path) and os.path.getsize(artifact_path) > 0:
                print(f"Successfully generated compressed UDIF DMG at {artifact_path}")
            else:
                shutil.copy2(temp_raw_dmg, artifact_path)
                print(f"dmg_tool failed or missing, kept hybrid DMG at {artifact_path}")
        else:
            shutil.copy2(temp_raw_dmg, artifact_path)
            print(f"Saved hybrid DMG at {artifact_path}")

    finally:
        shutil.rmtree(staging_dir, ignore_errors=True)
        if os.path.exists(temp_raw_dmg):
            try:
                os.remove(temp_raw_dmg)
            except OSError:
                pass

if __name__ == "__main__":
    main()
