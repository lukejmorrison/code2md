import argparse
import os
from fpdf import FPDF
from PyPDF2 import PdfReader, PdfWriter
import tempfile
from datetime import datetime

def build_tree_dict(paths, root):
    """Build a dictionary representing the directory structure from file paths."""
    tree = {}
    for path in paths:
        rel_path = os.path.relpath(path, root)
        parts = rel_path.split(os.sep)
        current = tree
        for part in parts[:-1]:
            if part not in current:
                current[part] = {}
            current = current[part]
        current[parts[-1]] = None
    return tree

def build_tree_lines(tree, prefix=''):
    """Generate a text-based tree representation with ASCII connectors."""
    lines = []
    items = sorted(tree.items())
    for i, (name, subtree) in enumerate(items):
        is_last = (i == len(items) - 1)
        connector = '`-- ' if is_last else '|-- '
        if subtree is None:  # File
            lines.append(prefix + connector + name)
        else:  # Folder
            lines.append(prefix + connector + name)
            extension = '    ' if is_last else '|   '
            lines.extend(build_tree_lines(subtree, prefix + extension))
    return lines

def generate_output_filename(base_name, extension=".pdf"):
    """Generate a unique filename with an incrementing version number."""
    version = 1
    output_file = f"{base_name}v{version:02d}{extension}"
    while os.path.exists(output_file):
        version += 1
        output_file = f"{base_name}v{version:02d}{extension}"
    return output_file

def main():
    # Parse command-line arguments (no --output option)
    parser = argparse.ArgumentParser(description="Compile files into a PDF with TOC on the first page.")
    parser.add_argument("files", nargs='+', help="Files to compile")
    args = parser.parse_args()

    # Get the common path and workspace name
    common_path = os.path.commonpath(args.files)
    workspace_name = os.path.basename(common_path)

    # Create the base filename with timestamp and workspace name
    timestamp = datetime.now().strftime("%Y-%m_%d_%H%M")
    base_name = f"{timestamp}_{workspace_name}"

    # Generate content PDF and track starting pages
    content_pdf = FPDF()
    content_pdf.set_font("Courier", size=10)
    file_pages = []  # List of (file, start_page) in content_pdf
    for file in args.files:
        if os.path.isfile(file):
            start_page = content_pdf.page_no() + 1  # 1-based page number
            file_pages.append((file, start_page))
            content_pdf.add_page()
            safe_file = file.encode('latin-1', 'replace').decode('latin-1')
            content_pdf.cell(0, 10, txt=f"--- {safe_file} ---", ln=True)
            try:
                with open(file, 'r', encoding='utf-8') as f:
                    for line in f:
                        safe_line = line.rstrip().encode('latin-1', 'replace').decode('latin-1')
                        content_pdf.cell(0, 5, txt=safe_line, ln=True)
            except Exception as e:
                error_msg = f"Error reading file: {e}".encode('latin-1', 'replace').decode('latin-1')
                content_pdf.cell(0, 5, txt=error_msg, ln=True)
        else:
            print(f"File {file} not found, skipping.")

    # Save content PDF to a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_content:
        content_pdf.output(temp_content.name)
        content_pdf_path = temp_content.name

    # Build file tree for TOC
    tree_dict = build_tree_dict(args.files, os.path.dirname(common_path))
    tree_lines = [common_path] + build_tree_lines(tree_dict)

    # Generate TOC PDF
    toc_pdf = FPDF()
    toc_pdf.set_font("Courier", size=12)
    toc_pdf.add_page()
    safe_workspace = workspace_name.encode('latin-1', 'replace').decode('latin-1')
    toc_pdf.cell(0, 10, txt=f"Workspace: {safe_workspace}", ln=True)
    toc_pdf.cell(0, 10, txt="", ln=True)  # Spacer
    toc_pdf.cell(0, 10, txt="File Tree:", ln=True)
    for line in tree_lines:
        safe_line = line.encode('latin-1', 'replace').decode('latin-1')
        toc_pdf.cell(0, 5, txt=safe_line, ln=True)
    toc_pdf.cell(0, 10, txt="", ln=True)  # Spacer
    toc_pdf.cell(0, 10, txt="Table of Contents:", ln=True)
    toc_pages = 1  # Assuming TOC fits on one page
    for file, start_page in file_pages:
        final_page = start_page + toc_pages  # Adjust for TOC pages
        safe_file = file.encode('latin-1', 'replace').decode('latin-1')
        toc_pdf.cell(0, 5, txt=f"{safe_file} - Page {final_page}", ln=True)

    # Save TOC PDF to a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_toc:
        toc_pdf.output(temp_toc.name)
        toc_pdf_path = temp_toc.name

    # Merge TOC and content PDFs
    output = PdfWriter()
    toc_reader = PdfReader(toc_pdf_path)
    content_reader = PdfReader(content_pdf_path)
    for page in toc_reader.pages:
        output.add_page(page)
    for page in content_reader.pages:
        output.add_page(page)

    # Generate the final output filename with version incrementing
    output_file = generate_output_filename(base_name)
    with open(output_file, "wb") as f:
        output.write(f)

    # Clean up temporary files
    os.remove(toc_pdf_path)
    os.remove(content_pdf_path)
    print(f"PDF created: {output_file}")

if __name__ == "__main__":
    main()