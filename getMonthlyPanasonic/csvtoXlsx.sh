#!/bin/bash

# Read each line from the csvToXlsxList.txt file
while IFS= read -r csv_file
do
  # Get the base name without extension
  base_name=$(basename "$csv_file" .csv)
  
  # Form the output file name with .xlsx extension
  xlsx_file="./xlsx/"
  
  # Run the csvtoxlsx CLI to convert the file
  npx @aternus/csv-to-xlsx -i "$csv_file" -o "$xlsx_file"
  
  echo "Converted $csv_file to $xlsx_file"
done < csvToXlsxList.txt