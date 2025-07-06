# نظام إدارة التراخيص

نظام احترافي لإدارة تراخيص العملاء مع دعم رفع ملفات Excel وعرض لوحة تحكم شاملة.

## Features

- **Excel File Upload**: Upload Excel files with license data
- **Data Processing**: 
  - Takes the first occurrence of Activation Date
  - Uses the latest Expiry Date for each license
  - Handles duplicate client names with notifications
- **Dashboard**: 
  - Total number of clients
  - Total number of devices
  - Number of licenses expiring in less than one month
- **Professional UI**: Clean, modern interface with responsive design

## Required Excel Columns

Your Excel file must contain the following columns:

| Column Name | Description |
|-------------|-------------|
| ID | Unique identifier |
| Client | Client name |
| Product | Product name |
| Activation Date | Date when license was activated |
| Expiry Date | Date when license expires |
| License Key | License key string |
| Activations | Number of activations |
| Hardware IDs | Comma-separated hardware IDs |
| License | License type/name |

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```

## Usage

1. **Upload Excel File**: 
   - Navigate to the home page
   - Click "Choose Excel File" to select your Excel file
   - Click "Upload and Process" to process the data

2. **View Dashboard**:
   - After successful upload, you'll be redirected to the dashboard
   - View statistics and detailed client information
   - Use "Upload New File" to process another file

3. **Notifications**:
   - Duplicate client names will show a warning notification
   - Success/error messages are displayed clearly

## Data Processing Logic

- **Activation Date**: Only the first occurrence is used
- **Expiry Date**: The latest date is used for each license
- **Duplicate Clients**: Warning notifications are shown for duplicate client names
- **Hardware IDs**: Merged from all records for each client-license combination

## Technologies Used

- React 17
- TypeScript
- React Router DOM
- XLSX library for Excel processing
- Local Storage for data persistence

## Project Structure

```
src/
├── components/
│   ├── Dashboard.tsx      # Dashboard with statistics and data table
│   ├── ExcelUpload.tsx    # File upload component
│   └── Notification.tsx   # Notification component
├── types/
│   └── index.ts          # TypeScript interfaces
├── utils/
│   └── excelParser.ts    # Excel parsing and data processing logic
└── App.tsx               # Main application component
```

## Development

To run the development server:

```bash
npm start
```

The application will be available at `http://localhost:3000`

## Building for Production

```bash
npm run build
```

This creates a `build` folder with optimized production files.

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

MIT License
This project is licensed under the MIT License. See the LICENSE file for details.