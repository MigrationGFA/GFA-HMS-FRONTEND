# GFA Health HMS

Offline sales demo of the GFA Health Hospital Management System by **GFA Health Technologies Ltd**.

Website: [https://gfa-health.com/](https://gfa-health.com/)

This build uses local / IndexedDB sample data only. There is no backend integration.

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Demo logins

Password for all accounts: `password`

| Role | Email |
|------|-------|
| Super Admin | superadmin@gfa-health.demo |
| Admin | admin@gfa-health.demo |

The Admin Officer workspace is at `/dashboard/admin`. See `docs/ADMIN.md`.
| Doctor | doctor@gfa-health.demo |
| Dental Department | dental@gfa-health.demo |
| Eye Clinic | eye@gfa-health.demo |
| Paediatrics | paeds@gfa-health.demo |
| Nurse | nurse@gfa-health.demo |
| Records | records@gfa-health.demo |
| Lab | lab@gfa-health.demo |
| Pharmacist | pharmacist@gfa-health.demo |
| Cashier | cashier@gfa-health.demo |
| CMD | cmd@gfa-health.demo |
| Patient | patient@gfa-health.demo |

More role emails follow the same pattern (`hr@`, `finance@`, `radiology@`, …).

## Branding

- Product: **GFA Health HMS**
- Sample hospital in the UI: **GFA Demo Hospital**
- Vendor: **GFA Health Technologies Ltd**
- Logo: `src/assets/GFA-health.png`
- Palette: royal blue + mint green (aligned with the public GFA Health brand)

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local demo server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm test` | Unit tests |
| `npm run lint` | ESLint |
