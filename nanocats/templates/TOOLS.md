# Tool Usage Notes

Tool signatures are provided automatically via function calling.
This file documents non-obvious constraints and usage patterns.

## read_file — Read File Contents

- Use this first before editing files to see current content
- Returns file content or error message
- Large files are truncated at 128KB

## edit_file — Edit Specific Text

- **Required**: Must provide exact `old_text` that exists in the file
- Replaces the first match only
- **Use read_file first** to see current content
- If `old_text` appears multiple times, provide more context to make it unique

### Example

```
# Before editing, read the file first
read_file(path="USER.md")

# Then edit specific text
edit_file(
  path="USER.md",
  old_text="- **Name**: (your name)",
  new_text="- **Name**: 小明"
)
```

## write_file — Write Entire File

- Overwrites the entire file content
- **Use read_file first** to see current content
- Useful when you want to completely rewrite a file

## delete_file — Delete a File

- Permanently deletes the specified file
- Use with caution!

## exec — Safety Limits

- Commands have a configurable timeout (default 60s)
- Dangerous commands are blocked (rm -rf, format, dd, shutdown, etc.)
- Output is truncated at 10,000 characters
- `restrictToWorkspace` config can limit file access to the workspace

## cron — Scheduled Reminders

- Please refer to cron skill for usage.
