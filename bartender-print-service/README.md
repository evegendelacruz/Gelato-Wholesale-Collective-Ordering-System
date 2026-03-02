# BarTender Print Service

Automated label printing service for Momolato ordering system using BarTender SDK.

---

## 🎯 What This Does

This service provides **TRUE one-click automated printing** for your label system:

1. Web app sends label data via HTTP API
2. Service processes through BarTender SDK
3. BarTender formats and prints to Toshiba B-415
4. Multiple labels print automatically in sequence

**No manual intervention required!**

---

## 📦 What You Get

### Backend Service (`bartender-print-service/`)
- **server.js** - Express API server
- **bartender-controller.js** - BarTender SDK interface
- **install-service.js** - Windows Service installer
- **SETUP_GUIDE.md** - Complete installation guide
- **INTEGRATION_GUIDE.md** - Web app integration steps

### Frontend API (`lib/bartenderAPI.ts`)
- **printLabelsWithBarTender()** - Send labels to printer
- **checkBarTenderStatus()** - Check if service is online
- **getAvailablePrinters()** - List available printers

---

## 🚀 Quick Start

### 1. Prerequisites

✅ Windows 10/11
✅ BarTender Automation Edition
✅ Node.js 14+
✅ Toshiba B-415 Printer installed

### 2. Install Service

```bash
cd bartender-print-service
npm install
```

### 3. Configure

Copy `.env.example` to `.env` and update:

```env
PORT=3001
BARTENDER_PATH=C:\\Program Files\\Seagull\\BarTender 2021
DEFAULT_PRINTER=Toshiba B-415
TEMPLATE_PATH=C:\\Users\\User\\Desktop\\momolato-ordering-system\\public\\assets
```

### 4. Add BarTender SDK DLL

```bash
# Create refs folder
mkdir refs

# Copy BarTender SDK DLL
copy "C:\Program Files\Seagull\BarTender 2021\SDK Assemblies\BarTender.Print.dll" refs\
```

### 5. Start Service

```bash
npm start
```

Should see:
```
✅ Service running on: http://localhost:3001
✅ BarTender engine initialized and ready
```

### 6. Update Web App

Add to `.env.local`:
```env
NEXT_PUBLIC_BARTENDER_API_URL=http://localhost:3001
NEXT_PUBLIC_BARTENDER_TEMPLATE_PATH=C:\\Users\\User\\Desktop\\momolato-ordering-system\\public\\assets\\Sample.btw
NEXT_PUBLIC_DEFAULT_PRINTER=Toshiba B-415
```

### 7. Test Print

1. Open web app
2. Navigate to order with labels
3. Click "🖨️ BarTender SDK Print"
4. Labels print automatically! 🎉

---

## 📚 Documentation

- **SETUP_GUIDE.md** - Detailed installation and configuration
- **INTEGRATION_GUIDE.md** - Web app integration code
- **API.md** - API endpoint reference (see below)

---

## 🔌 API Endpoints

### Health Check
```
GET http://localhost:3001/health
```

Returns:
```json
{
  "status": "ok",
  "service": "BarTender Print Service",
  "version": "1.0.0",
  "bartenderReady": true
}
```

### Print Labels
```
POST http://localhost:3001/api/bartender/print
Content-Type: application/json
```

Body:
```json
{
  "labels": [
    {
      "companyName": "Test Company",
      "productName": "Test Product",
      "ingredients": "Optional ingredients",
      "allergen": "Allergen information",
      "bestBefore": "01/01/2025",
      "batchNumber": "BATCH001"
    }
  ],
  "templatePath": "C:\\path\\to\\Sample.btw",
  "printerName": "Toshiba B-415",
  "copies": 1
}
```

Response:
```json
{
  "success": true,
  "printed": 1,
  "total": 1,
  "message": "Successfully printed 1 labels"
}
```

### Get Printers
```
GET http://localhost:3001/api/bartender/printers
```

Returns:
```json
{
  "success": true,
  "printers": ["Toshiba B-415", "Microsoft Print to PDF", ...]
}
```

### Initialize Engine
```
POST http://localhost:3001/api/bartender/initialize
```

Response:
```json
{
  "success": true,
  "message": "BarTender engine initialized successfully"
}
```

### Shutdown Engine
```
POST http://localhost:3001/api/bartender/shutdown
```

Response:
```json
{
  "success": true,
  "message": "BarTender engine shut down successfully"
}
```

---

## 🛠️ Optional: Install as Windows Service

Run automatically when Windows starts:

```bash
npm run install-service
```

Manage service:
- Open `services.msc`
- Find "BarTender Print Service"
- Start/Stop/Restart

Uninstall:
```bash
npm run uninstall-service
```

---

## 🏷️ Template Setup

Your BTW template must have **named fields**:

1. Open `Sample.btw` in BarTender Designer
2. Right-click each text field → Properties
3. Data Source tab → Type: "Named Data Source"
4. Set name: `CompanyName`, `ProductName`, `Ingredients`, `Allergen`, `BestBefore`, `BatchNumber`
5. Save template

---

## 🐛 Troubleshooting

### Service won't start
- Check BarTender Automation is installed
- Run as Administrator
- Check port 3001 is not in use

### Can't print
- Verify printer name is correct (check `services.msc`)
- Test print from BarTender Designer first
- Check template path in `.env`
- Verify template has named fields

### Web app can't connect
- Ensure service is running (`npm start`)
- Check `NEXT_PUBLIC_BARTENDER_API_URL` in `.env.local`
- Test health endpoint in browser: `http://localhost:3001/health`

### Prints blank labels
- Check template field names match data fields
- Open template in BarTender and verify named data sources
- Check service console for error messages

---

## 📊 Architecture

```
┌─────────────┐         HTTP          ┌──────────────────┐
│             │ ───────────────────>  │                  │
│  Web App    │                       │  Print Service   │
│  (Next.js)  │ <─────────────────── │  (Node.js)       │
│             │         JSON          │                  │
└─────────────┘                       └──────────────────┘
                                              │
                                              │ BarTender SDK
                                              │ (.NET API)
                                              ▼
                                      ┌──────────────────┐
                                      │                  │
                                      │   BarTender      │
                                      │   Engine         │
                                      │                  │
                                      └──────────────────┘
                                              │
                                              │ Print Jobs
                                              ▼
                                      ┌──────────────────┐
                                      │  Toshiba B-415   │
                                      │     Printer      │
                                      └──────────────────┘
```

---

## 🎯 Features

✅ **True One-Click Printing** - No manual steps
✅ **Batch Processing** - Print multiple labels automatically
✅ **Template-Based** - Uses your existing BTW templates
✅ **Direct Printing** - No intermediate files needed
✅ **Error Handling** - Detailed error messages
✅ **Status Monitoring** - Check service health from web app
✅ **Windows Service** - Optional auto-start with Windows
✅ **Printer Selection** - Support for multiple printers

---

## 📞 Support

**Issues:**
- Check service console output
- Review BarTender SDK documentation
- Test endpoints with Postman/curl
- Verify BarTender license is active

**References:**
- [BarTender SDK Documentation](https://support.seagullscientific.com/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Documentation](https://expressjs.com/)

---

## 📝 License

MIT License - For internal use with Momolato ordering system

---

**Ready to print! 🖨️ Start the service and enjoy automated label printing!**
