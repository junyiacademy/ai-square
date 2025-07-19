#!/bin/bash

# Fix recordAttempt calls to match AttemptData interface

echo "Fixing recordAttempt calls..."

# Find all files with recordAttempt calls
FILES=$(grep -r "recordAttempt" src/app/api --include="*.ts" --exclude-dir="__tests__" -l)

for file in $FILES; do
  echo "Processing: $file"
  
  # Create a temporary file for complex replacements
  cp "$file" "$file.tmp"
  
  # Use awk to fix recordAttempt calls
  awk '
  /recordAttempt\(/ {
    # Mark that we found recordAttempt
    in_record_attempt = 1
    print $0
    next
  }
  in_record_attempt && /timestamp:/ {
    # Skip timestamp lines
    next
  }
  in_record_attempt && /type:/ {
    # Skip type lines
    next  
  }
  in_record_attempt && /(context|content):/ {
    # Replace context/content with response
    gsub(/context:/, "response:")
    gsub(/content:/, "response:")
    print $0
    next
  }
  in_record_attempt && /timeSpent:/ {
    # Keep timeSpent
    print $0
    next
  }
  in_record_attempt && /\}\);/ {
    # End of recordAttempt call
    in_record_attempt = 0
    print $0
    next
  }
  {
    # Print all other lines
    print $0
  }
  ' "$file.tmp" > "$file"
  
  rm "$file.tmp"
done

echo "recordAttempt fixes completed!"