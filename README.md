# Meditech Output Parser

## Table of Contents
+ [About](#about)
+ [Getting Started](#getting_started)
+ [Parsing Process](#parsing_process)
+ [Author](#author)
+ [Acknowledgements](#acknowledgements)

## About <a name = "about"></a>
This utility was created to convert text-formatted data into CSV-formatted data from the Meditech system. 

As of the creation of this utility, Meditech outputs all data in the form of loosely formatted text. This text-based output is likely derived from a terminal. The Meditech Parser takes this output and converts it into a similarily formatted CSV file.

### Prerequisites

To Rebuild the Parser from source, the following must be installed:

- [Node JS and NPM (Node Package Manager)](https://nodejs.org/en/download/)
- An internet connection
- A text editor

To Edit a Prebuilt Copy, the following must be installed:

- A text editor

## Getting Started <a name = "getting_started"></a>

### Rebuilding from Source

1. Run the following command in the project root to ensure you have all the necessary packages required to rebuild from source.
    
    ```bash
    $ npm install
    ```

2. Make the necessary edits to any of the files located under the "src" directory.

2. Open a terminal instance at the root of the project directory and run the following command:

    ```bash
    $ npm run build:dev
    ```

3. If it isn't already created, a "dist" folder will be created at the root of the project directory and the compiled Meditech Parser will be placed there. This file can be distributed or run.

### Editing a Compiled Meditech Parser

1. Open the compiled .html file with your preferred text editor (or IDE!) of choice.

2. Edit the desired section(s), save and close.

Note: Different scripts and styling are denoted with comments within the HTML

## Parsing Process <a name = "parsing_process"></a>

### Where to Start Reading From?

Check out the "main.js" file in the "src" directory. A few functions referenced in this file are from the "parse.js", "blob.js", and "filesaver.js" files.

### How It Works

1. The report is checked for validity (does it have the right report type?) and it is split into sections by the term "DATE: "

2. The report type and the meta information are retrieved from the data. Report type refers to whether the data is sorted by category (Mammography, Radiography, etc) or by site. Meta information refers to how the column headers are separated from the data (dashes or something else?) and where the data begins within a section. A section is dictated by where we previously split the data on "DATE: ".

3. Each section is iterated over and each section line examined. The operation applied is determined by the type of data contained on the section line:
    A. A Subsection: The columns for the section are retrieved and stored. We record that we have seen the section before if it's the first pass. If not, we lock the section to prevent further row additions.
    B. Data: Data is added the appropriate section/subsection. If this is the first time we've seen this section/subsection, new rows are added. If this is not the first time, data is appended to the corresponding row.
    C. A Total: The data from this line is gathered, and filtered. A total also signals the end of a subsection. If we're on the first pass for this section/subsection, lock it and move on.
    D. A Grand Total: The data from this line is gathered, filtered, and recorded.
    E. A Repeat/Reject Rate: Same as the Grand Total.
    F. Total Materials: Same as the Grand Total.

4. The gathered data is then converted into a formatted CSV string delimited with commas. Structure of the CSV string is similar to the original structure of the data. Multiple files are concatenated one after the other and denoted by filename. Files are organized alphabetically within the string.

5. Blob.js and Filesaver.js are then used to convert the string to a file. The user is prompted to download the compiled CSV.

### Assumptions

If any of the following assumptions are violated within the output file, the parser will not function:

- Data rows are assumed to have:
    - Two spaces before the data
    - Columns separated by two (or more) spaces
    - A number of columns (from the start of the table) that reappear when a table is split in half

- Subsections and other metadata are assumed to have:
    - No space before data

- The column row is assumed to have:
    - No spaces in column names
    - Two spaces at the start of the row

- There are two repeating columns at the beginning of each table

## Usage <a name = "usage"></a>

Double click the compiled .html file to open the Meditech Parser in your browser of choice. The parser works best in Mozilla Firefox, Google Chrome, or Safari. Internet Explorer is supported, however, drag and drop is not available when using it.

## Author<a name = "author"></a>

- Reece Walsh [(@brikwerk)](https://github.com/brikwerk)

## Acknowledgements <a name = "acknowledgements"></a>

- Eli Grey (Usage of Blob.js and Filesaver.js)
- Stuart Knightley (Usage of JSZip.js)
