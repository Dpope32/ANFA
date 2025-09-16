import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// PocketBase configuration
const POCKETBASE_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@tesla.data';
const ADMIN_PASSWORD = 'TeslaData2024!';

// Tesla Vehicle Models Data Structure
interface TeslaVehicle {
  model: string;
  variant: string;
  year_introduced: number;
  year_discontinued?: number;
  vehicle_type: string;
  seating_capacity: number;
  range_miles: number;
  zero_to_sixty: number;
  top_speed_mph: number;
  base_price_usd: number;
  battery_capacity_kwh: number;
  drive_type: string;
  cargo_volume_cu_ft: number;
  weight_lbs: number;
  length_inches: number;
  width_inches: number;
  height_inches: number;
  wheelbase_inches: number;
  ground_clearance_inches: number;
  drag_coefficient: number;
  supercharging_max_kw: number;
  ac_charging_max_kw: number;
  autopilot_capable: boolean;
  fsd_capable: boolean;
  production_status: string;
  manufacturing_location: string[];
  key_features: string[];
  image_url?: string;
}

// Comprehensive Tesla Vehicle Data
const teslaVehicles: TeslaVehicle[] = [
  // Model S Variants
  {
    model: "Model S",
    variant: "Long Range",
    year_introduced: 2023,
    vehicle_type: "Sedan",
    seating_capacity: 5,
    range_miles: 405,
    zero_to_sixty: 3.1,
    top_speed_mph: 155,
    base_price_usd: 88490,
    battery_capacity_kwh: 100,
    drive_type: "Dual Motor AWD",
    cargo_volume_cu_ft: 28,
    weight_lbs: 4766,
    length_inches: 195.9,
    width_inches: 77.3,
    height_inches: 56.9,
    wheelbase_inches: 116.5,
    ground_clearance_inches: 4.6,
    drag_coefficient: 0.208,
    supercharging_max_kw: 250,
    ac_charging_max_kw: 11.5,
    autopilot_capable: true,
    fsd_capable: true,
    production_status: "Active",
    manufacturing_location: ["Fremont, CA"],
    key_features: ["Yoke steering", "17\" touchscreen", "Glass roof", "Premium audio", "HEPA filter"],
    image_url: "https://tesla.com/models/design"
  },
  {
    model: "Model S",
    variant: "Plaid",
    year_introduced: 2021,
    vehicle_type: "Sedan",
    seating_capacity: 5,
    range_miles: 396,
    zero_to_sixty: 1.99,
    top_speed_mph: 200,
    base_price_usd: 108490,
    battery_capacity_kwh: 100,
    drive_type: "Tri Motor AWD",
    cargo_volume_cu_ft: 28,
    weight_lbs: 4828,
    length_inches: 195.9,
    width_inches: 77.3,
    height_inches: 56.9,
    wheelbase_inches: 116.5,
    ground_clearance_inches: 4.6,
    drag_coefficient: 0.208,
    supercharging_max_kw: 250,
    ac_charging_max_kw: 11.5,
    autopilot_capable: true,
    fsd_capable: true,
    production_status: "Active",
    manufacturing_location: ["Fremont, CA"],
    key_features: ["Yoke steering", "17\" touchscreen", "Glass roof", "Premium audio", "Track mode", "Carbon fiber interior"],
    image_url: "https://tesla.com/models/design"
  },

  // Model 3 Variants
  {
    model: "Model 3",
    variant: "Standard Range Plus",
    year_introduced: 2017,
    year_discontinued: 2023,
    vehicle_type: "Sedan",
    seating_capacity: 5,
    range_miles: 272,
    zero_to_sixty: 5.8,
    top_speed_mph: 140,
    base_price_usd: 40240,
    battery_capacity_kwh: 60,
    drive_type: "RWD",
    cargo_volume_cu_ft: 15,
    weight_lbs: 3862,
    length_inches: 184.8,
    width_inches: 72.8,
    height_inches: 56.8,
    wheelbase_inches: 113.2,
    ground_clearance_inches: 5.5,
    drag_coefficient: 0.23,
    supercharging_max_kw: 170,
    ac_charging_max_kw: 11.5,
    autopilot_capable: true,
    fsd_capable: true,
    production_status: "Discontinued",
    manufacturing_location: ["Fremont, CA", "Shanghai, China"],
    key_features: ["15\" touchscreen", "Glass roof", "Premium connectivity", "Heated seats"],
    image_url: "https://tesla.com/model3/design"
  },
  {
    model: "Model 3",
    variant: "Long Range AWD",
    year_introduced: 2017,
    vehicle_type: "Sedan",
    seating_capacity: 5,
    range_miles: 358,
    zero_to_sixty: 4.2,
    top_speed_mph: 145,
    base_price_usd: 47240,
    battery_capacity_kwh: 82,
    drive_type: "Dual Motor AWD",
    cargo_volume_cu_ft: 15,
    weight_lbs: 4065,
    length_inches: 184.8,
    width_inches: 72.8,
    height_inches: 56.8,
    wheelbase_inches: 113.2,
    ground_clearance_inches: 5.5,
    drag_coefficient: 0.23,
    supercharging_max_kw: 250,
    ac_charging_max_kw: 11.5,
    autopilot_capable: true,
    fsd_capable: true,
    production_status: "Active",
    manufacturing_location: ["Fremont, CA", "Shanghai, China", "Berlin, Germany"],
    key_features: ["15\" touchscreen", "Glass roof", "Premium audio", "Heated seats", "Dual motor"],
    image_url: "https://tesla.com/model3/design"
  },
  {
    model: "Model 3",
    variant: "Performance",
    year_introduced: 2018,
    vehicle_type: "Sedan",
    seating_capacity: 5,
    range_miles: 315,
    zero_to_sixty: 3.1,
    top_speed_mph: 162,
    base_price_usd: 53240,
    battery_capacity_kwh: 82,
    drive_type: "Dual Motor AWD",
    cargo_volume_cu_ft: 15,
    weight_lbs: 4065,
    length_inches: 184.8,
    width_inches: 72.8,
    height_inches: 56.8,
    wheelbase_inches: 113.2,
    ground_clearance_inches: 5.5,
    drag_coefficient: 0.23,
    supercharging_max_kw: 250,
    ac_charging_max_kw: 11.5,
    autopilot_capable: true,
    fsd_capable: true,
    production_status: "Active",
    manufacturing_location: ["Fremont, CA", "Shanghai, China", "Berlin, Germany"],
    key_features: ["15\" touchscreen", "Glass roof", "Premium audio", "Track mode", "Performance brakes", "Lowered suspension"],
    image_url: "https://tesla.com/model3/design"
  },

  // Model X Variants
  {
    model: "Model X",
    variant: "Long Range",
    year_introduced: 2015,
    vehicle_type: "SUV",
    seating_capacity: 7,
    range_miles: 348,
    zero_to_sixty: 3.8,
    top_speed_mph: 155,
    base_price_usd: 98490,
    battery_capacity_kwh: 100,
    drive_type: "Dual Motor AWD",
    cargo_volume_cu_ft: 88,
    weight_lbs: 5421,
    length_inches: 198.3,
    width_inches: 78.7,
    height_inches: 66.3,
    wheelbase_inches: 116.7,
    ground_clearance_inches: 5.4,
    drag_coefficient: 0.24,
    supercharging_max_kw: 250,
    ac_charging_max_kw: 11.5,
    autopilot_capable: true,
    fsd_capable: true,
    production_status: "Active",
    manufacturing_location: ["Fremont, CA"],
    key_features: ["Falcon Wing doors", "17\" touchscreen", "Glass roof", "Premium audio", "HEPA filter", "Towing capacity 5000 lbs"],
    image_url: "https://tesla.com/modelx/design"
  },
  {
    model: "Model X",
    variant: "Plaid",
    year_introduced: 2021,
    vehicle_type: "SUV",
    seating_capacity: 6,
    range_miles: 333,
    zero_to_sixty: 2.5,
    top_speed_mph: 163,
    base_price_usd: 108490,
    battery_capacity_kwh: 100,
    drive_type: "Tri Motor AWD",
    cargo_volume_cu_ft: 88,
    weight_lbs: 5467,
    length_inches: 198.3,
    width_inches: 78.7,
    height_inches: 66.3,
    wheelbase_inches: 116.7,
    ground_clearance_inches: 5.4,
    drag_coefficient: 0.24,
    supercharging_max_kw: 250,
    ac_charging_max_kw: 11.5,
    autopilot_capable: true,
    fsd_capable: true,
    production_status: "Active",
    manufacturing_location: ["Fremont, CA"],
    key_features: ["Falcon Wing doors", "Yoke steering", "17\" touchscreen", "Glass roof", "Premium audio", "Track mode"],
    image_url: "https://tesla.com/modelx/design"
  },

  // Model Y Variants
  {
    model: "Model Y",
    variant: "Standard Range",
    year_introduced: 2020,
    year_discontinued: 2021,
    vehicle_type: "SUV",
    seating_capacity: 5,
    range_miles: 244,
    zero_to_sixty: 5.3,
    top_speed_mph: 135,
    base_price_usd: 41990,
    battery_capacity_kwh: 60,
    drive_type: "RWD",
    cargo_volume_cu_ft: 68,
    weight_lbs: 4363,
    length_inches: 187,
    width_inches: 75.6,
    height_inches: 63.9,
    wheelbase_inches: 113.8,
    ground_clearance_inches: 6.6,
    drag_coefficient: 0.23,
    supercharging_max_kw: 170,
    ac_charging_max_kw: 11.5,
    autopilot_capable: true,
    fsd_capable: true,
    production_status: "Discontinued",
    manufacturing_location: ["Fremont, CA"],
    key_features: ["15\" touchscreen", "Glass roof", "Power liftgate", "Premium connectivity"],
    image_url: "https://tesla.com/modely/design"
  },
  {
    model: "Model Y",
    variant: "Long Range AWD",
    year_introduced: 2020,
    vehicle_type: "SUV",
    seating_capacity: 7,
    range_miles: 330,
    zero_to_sixty: 4.8,
    top_speed_mph: 135,
    base_price_usd: 54990,
    battery_capacity_kwh: 82,
    drive_type: "Dual Motor AWD",
    cargo_volume_cu_ft: 68,
    weight_lbs: 4416,
    length_inches: 187,
    width_inches: 75.6,
    height_inches: 63.9,
    wheelbase_inches: 113.8,
    ground_clearance_inches: 6.6,
    drag_coefficient: 0.23,
    supercharging_max_kw: 250,
    ac_charging_max_kw: 11.5,
    autopilot_capable: true,
    fsd_capable: true,
    production_status: "Active",
    manufacturing_location: ["Fremont, CA", "Shanghai, China", "Austin, TX", "Berlin, Germany"],
    key_features: ["15\" touchscreen", "Glass roof", "Power liftgate", "Premium audio", "Towing capacity 3500 lbs"],
    image_url: "https://tesla.com/modely/design"
  },
  {
    model: "Model Y",
    variant: "Performance",
    year_introduced: 2020,
    vehicle_type: "SUV",
    seating_capacity: 5,
    range_miles: 303,
    zero_to_sixty: 3.5,
    top_speed_mph: 155,
    base_price_usd: 60990,
    battery_capacity_kwh: 82,
    drive_type: "Dual Motor AWD",
    cargo_volume_cu_ft: 68,
    weight_lbs: 4416,
    length_inches: 187,
    width_inches: 75.6,
    height_inches: 63.9,
    wheelbase_inches: 113.8,
    ground_clearance_inches: 6.6,
    drag_coefficient: 0.23,
    supercharging_max_kw: 250,
    ac_charging_max_kw: 11.5,
    autopilot_capable: true,
    fsd_capable: true,
    production_status: "Active",
    manufacturing_location: ["Fremont, CA", "Shanghai, China", "Austin, TX", "Berlin, Germany"],
    key_features: ["15\" touchscreen", "Glass roof", "Power liftgate", "Track mode", "Performance brakes", "Lowered suspension"],
    image_url: "https://tesla.com/modely/design"
  },

  // Cybertruck
  {
    model: "Cybertruck",
    variant: "Single Motor RWD",
    year_introduced: 2024,
    vehicle_type: "Truck",
    seating_capacity: 6,
    range_miles: 250,
    zero_to_sixty: 6.7,
    top_speed_mph: 112,
    base_price_usd: 60990,
    battery_capacity_kwh: 123,
    drive_type: "RWD",
    cargo_volume_cu_ft: 120,
    weight_lbs: 6603,
    length_inches: 231.7,
    width_inches: 79.8,
    height_inches: 75,
    wheelbase_inches: 149.9,
    ground_clearance_inches: 16,
    drag_coefficient: 0.34,
    supercharging_max_kw: 250,
    ac_charging_max_kw: 11.5,
    autopilot_capable: true,
    fsd_capable: true,
    production_status: "Active",
    manufacturing_location: ["Austin, TX"],
    key_features: ["Stainless steel body", "Bulletproof", "18.5\" touchscreen", "Adaptive air suspension", "Towing capacity 7500 lbs", "120V/240V outlets"],
    image_url: "https://tesla.com/cybertruck/design"
  },
  {
    model: "Cybertruck",
    variant: "Dual Motor AWD",
    year_introduced: 2024,
    vehicle_type: "Truck",
    seating_capacity: 6,
    range_miles: 340,
    zero_to_sixty: 4.1,
    top_speed_mph: 112,
    base_price_usd: 79990,
    battery_capacity_kwh: 123,
    drive_type: "Dual Motor AWD",
    cargo_volume_cu_ft: 120,
    weight_lbs: 6843,
    length_inches: 231.7,
    width_inches: 79.8,
    height_inches: 75,
    wheelbase_inches: 149.9,
    ground_clearance_inches: 16,
    drag_coefficient: 0.34,
    supercharging_max_kw: 250,
    ac_charging_max_kw: 11.5,
    autopilot_capable: true,
    fsd_capable: true,
    production_status: "Active",
    manufacturing_location: ["Austin, TX"],
    key_features: ["Stainless steel body", "Bulletproof", "18.5\" touchscreen", "Adaptive air suspension", "Towing capacity 11000 lbs", "120V/240V outlets"],
    image_url: "https://tesla.com/cybertruck/design"
  },
  {
    model: "Cybertruck",
    variant: "Tri Motor AWD Cyberbeast",
    year_introduced: 2024,
    vehicle_type: "Truck",
    seating_capacity: 6,
    range_miles: 320,
    zero_to_sixty: 2.6,
    top_speed_mph: 130,
    base_price_usd: 99990,
    battery_capacity_kwh: 123,
    drive_type: "Tri Motor AWD",
    cargo_volume_cu_ft: 120,
    weight_lbs: 6898,
    length_inches: 231.7,
    width_inches: 79.8,
    height_inches: 75,
    wheelbase_inches: 149.9,
    ground_clearance_inches: 16,
    drag_coefficient: 0.34,
    supercharging_max_kw: 250,
    ac_charging_max_kw: 11.5,
    autopilot_capable: true,
    fsd_capable: true,
    production_status: "Active",
    manufacturing_location: ["Austin, TX"],
    key_features: ["Stainless steel body", "Bulletproof", "18.5\" touchscreen", "Adaptive air suspension", "Towing capacity 14000 lbs", "120V/240V outlets", "Beast mode"],
    image_url: "https://tesla.com/cybertruck/design"
  },

  // Roadster (2025)
  {
    model: "Roadster",
    variant: "Base",
    year_introduced: 2025,
    vehicle_type: "Sports Car",
    seating_capacity: 4,
    range_miles: 620,
    zero_to_sixty: 1.9,
    top_speed_mph: 250,
    base_price_usd: 200000,
    battery_capacity_kwh: 200,
    drive_type: "Tri Motor AWD",
    cargo_volume_cu_ft: 12,
    weight_lbs: 4400,
    length_inches: 185,
    width_inches: 77,
    height_inches: 44.4,
    wheelbase_inches: 106,
    ground_clearance_inches: 4.3,
    drag_coefficient: 0.22,
    supercharging_max_kw: 250,
    ac_charging_max_kw: 11.5,
    autopilot_capable: true,
    fsd_capable: true,
    production_status: "Announced",
    manufacturing_location: ["Fremont, CA"],
    key_features: ["Removable roof", "0-100 mph in 4.2s", "1/4 mile in 8.8s", "Torque vectoring", "Glass roof"],
    image_url: "https://tesla.com/roadster"
  },

  // Semi Truck
  {
    model: "Semi",
    variant: "300 Mile Range",
    year_introduced: 2022,
    vehicle_type: "Semi Truck",
    seating_capacity: 2,
    range_miles: 300,
    zero_to_sixty: 20,
    top_speed_mph: 60,
    base_price_usd: 150000,
    battery_capacity_kwh: 500,
    drive_type: "Tri Motor",
    cargo_volume_cu_ft: 0,
    weight_lbs: 27000,
    length_inches: 720,
    width_inches: 102,
    height_inches: 156,
    wheelbase_inches: 240,
    ground_clearance_inches: 12,
    drag_coefficient: 0.36,
    supercharging_max_kw: 1000,
    ac_charging_max_kw: 0,
    autopilot_capable: true,
    fsd_capable: false,
    production_status: "Active",
    manufacturing_location: ["Reno, NV"],
    key_features: ["Central driving position", "Enhanced autopilot", "Megacharging", "80000 lb capacity"],
    image_url: "https://tesla.com/semi"
  },
  {
    model: "Semi",
    variant: "500 Mile Range",
    year_introduced: 2022,
    vehicle_type: "Semi Truck",
    seating_capacity: 2,
    range_miles: 500,
    zero_to_sixty: 20,
    top_speed_mph: 60,
    base_price_usd: 180000,
    battery_capacity_kwh: 850,
    drive_type: "Tri Motor",
    cargo_volume_cu_ft: 0,
    weight_lbs: 29000,
    length_inches: 720,
    width_inches: 102,
    height_inches: 156,
    wheelbase_inches: 240,
    ground_clearance_inches: 12,
    drag_coefficient: 0.36,
    supercharging_max_kw: 1000,
    ac_charging_max_kw: 0,
    autopilot_capable: true,
    fsd_capable: false,
    production_status: "Active",
    manufacturing_location: ["Reno, NV"],
    key_features: ["Central driving position", "Enhanced autopilot", "Megacharging", "80000 lb capacity", "Extended range battery"],
    image_url: "https://tesla.com/semi"
  },

  // Original Roadster (Historical)
  {
    model: "Roadster",
    variant: "Original",
    year_introduced: 2008,
    year_discontinued: 2012,
    vehicle_type: "Sports Car",
    seating_capacity: 2,
    range_miles: 245,
    zero_to_sixty: 3.7,
    top_speed_mph: 125,
    base_price_usd: 109000,
    battery_capacity_kwh: 53,
    drive_type: "RWD",
    cargo_volume_cu_ft: 5.8,
    weight_lbs: 2877,
    length_inches: 155.1,
    width_inches: 68.9,
    height_inches: 44.9,
    wheelbase_inches: 92.6,
    ground_clearance_inches: 3.6,
    drag_coefficient: 0.35,
    supercharging_max_kw: 0,
    ac_charging_max_kw: 16.8,
    autopilot_capable: false,
    fsd_capable: false,
    production_status: "Discontinued",
    manufacturing_location: ["Hethel, UK"],
    key_features: ["Lotus Elise platform", "First production Tesla", "Removable hardtop", "Sport mode"],
    image_url: "https://tesla.com/roadster-original"
  }
];

class PocketBaseSetup {
  private adminToken: string = '';

  async downloadPocketBase(): Promise<void> {
    console.log('📥 Downloading PocketBase...');
    
    const platform = process.platform;
    let downloadUrl: string;
    let fileName: string;
    
    if (platform === 'win32') {
      downloadUrl = 'https://github.com/pocketbase/pocketbase/releases/download/v0.20.2/pocketbase_0.20.2_windows_amd64.zip';
      fileName = 'pocketbase.zip';
    } else if (platform === 'darwin') {
      downloadUrl = 'https://github.com/pocketbase/pocketbase/releases/download/v0.20.2/pocketbase_0.20.2_darwin_amd64.zip';
      fileName = 'pocketbase.zip';
    } else {
      downloadUrl = 'https://github.com/pocketbase/pocketbase/releases/download/v0.20.2/pocketbase_0.20.2_linux_amd64.zip';
      fileName = 'pocketbase.zip';
    }

    const pocketbasePath = path.join(__dirname, 'pocketbase.exe');
    
    // Check if already exists
    if (fs.existsSync(pocketbasePath)) {
      console.log('✅ PocketBase already downloaded');
      return;
    }

    // Download
    const response = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
    const zipPath = path.join(__dirname, fileName);
    fs.writeFileSync(zipPath, response.data);
    
    // Extract
    if (platform === 'win32') {
      await execAsync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${__dirname}' -Force"`);
    } else {
      await execAsync(`unzip -o ${zipPath} -d ${__dirname}`);
    }
    
    // Clean up
    fs.unlinkSync(zipPath);
    console.log('✅ PocketBase downloaded and extracted');
  }

  async startPocketBase(): Promise<void> {
    console.log('🚀 Starting PocketBase...');
    
    const pocketbasePath = path.join(__dirname, process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase');
    
    // Start PocketBase in background
    const command = process.platform === 'win32' 
      ? `start /b "${pocketbasePath}" serve`
      : `${pocketbasePath} serve &`;
    
    exec(command);
    
    // Wait for PocketBase to start
    await this.waitForPocketBase();
    console.log('✅ PocketBase is running on http://127.0.0.1:8090');
  }

  async waitForPocketBase(): Promise<void> {
    for (let i = 0; i < 30; i++) {
      try {
        await axios.get(`${POCKETBASE_URL}/api/health`);
        return;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw new Error('PocketBase failed to start');
  }

  async createAdmin(): Promise<void> {
    console.log('👤 Creating admin account...');
    
    try {
      // Try to create admin
      await axios.post(`${POCKETBASE_URL}/api/admins`, {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        passwordConfirm: ADMIN_PASSWORD
      });
      console.log('✅ Admin account created');
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.log('ℹ️ Admin already exists, logging in...');
      } else {
        throw error;
      }
    }
    
    // Login
    const loginResponse = await axios.post(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
      identity: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    this.adminToken = loginResponse.data.token;
    console.log('✅ Logged in as admin');
  }

  async createTeslaVehiclesCollection(): Promise<void> {
    console.log('📊 Creating Tesla Vehicles collection...');
    
    const collectionSchema = {
      name: "tesla_vehicles",
      type: "base",
      schema: [
        { name: "model", type: "text", required: true },
        { name: "variant", type: "text", required: true },
        { name: "year_introduced", type: "number", required: true },
        { name: "year_discontinued", type: "number", required: false },
        { name: "vehicle_type", type: "select", required: true, options: {
          values: ["Sedan", "SUV", "Truck", "Sports Car", "Semi Truck"]
        }},
        { name: "seating_capacity", type: "number", required: true },
        { name: "range_miles", type: "number", required: true },
        { name: "zero_to_sixty", type: "number", required: true },
        { name: "top_speed_mph", type: "number", required: true },
        { name: "base_price_usd", type: "number", required: true },
        { name: "battery_capacity_kwh", type: "number", required: true },
        { name: "drive_type", type: "text", required: true },
        { name: "cargo_volume_cu_ft", type: "number", required: true },
        { name: "weight_lbs", type: "number", required: true },
        { name: "length_inches", type: "number", required: true },
        { name: "width_inches", type: "number", required: true },
        { name: "height_inches", type: "number", required: true },
        { name: "wheelbase_inches", type: "number", required: true },
        { name: "ground_clearance_inches", type: "number", required: true },
        { name: "drag_coefficient", type: "number", required: true },
        { name: "supercharging_max_kw", type: "number", required: true },
        { name: "ac_charging_max_kw", type: "number", required: true },
        { name: "autopilot_capable", type: "bool", required: true },
        { name: "fsd_capable", type: "bool", required: true },
        { name: "production_status", type: "select", required: true, options: {
          values: ["Active", "Discontinued", "Announced"]
        }},
        { name: "manufacturing_location", type: "json", required: true },
        { name: "key_features", type: "json", required: true },
        { name: "image_url", type: "url", required: false }
      ]
    };

    try {
      await axios.post(
        `${POCKETBASE_URL}/api/collections`,
        collectionSchema,
        {
          headers: { 'Authorization': this.adminToken }
        }
      );
      console.log('✅ Tesla Vehicles collection created');
    } catch (error: any) {
      if (error.response?.data?.message?.includes('already exists')) {
        console.log('ℹ️ Collection already exists');
      } else {
        throw error;
      }
    }
  }

  async populateTeslaData(): Promise<void> {
    console.log('📝 Populating Tesla vehicle data...');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const vehicle of teslaVehicles) {
      try {
        await axios.post(
          `${POCKETBASE_URL}/api/collections/tesla_vehicles/records`,
          vehicle,
          {
            headers: { 'Authorization': this.adminToken }
          }
        );
        successCount++;
        console.log(`✅ Added: ${vehicle.model} ${vehicle.variant}`);
      } catch (error: any) {
        errorCount++;
        console.error(`❌ Failed to add ${vehicle.model} ${vehicle.variant}:`, error.response?.data?.message || error.message);
      }
    }
    
    console.log(`\n📊 Data Population Complete:`);
    console.log(`   ✅ Success: ${successCount} records`);
    console.log(`   ❌ Errors: ${errorCount} records`);
    console.log(`   📈 Total: ${teslaVehicles.length} records`);
  }

  async createApiEndpoints(): Promise<void> {
    console.log('🔌 Creating API endpoints documentation...');
    
    const apiDocs = `
# Tesla Vehicles API Endpoints

## Base URL
http://127.0.0.1:8090/api

## Authentication (Optional for read operations)
POST /api/admins/auth-with-password
{
  "identity": "${ADMIN_EMAIL}",
  "password": "${ADMIN_PASSWORD}"
}

## Endpoints

### Get All Vehicles
GET /api/collections/tesla_vehicles/records

### Get Vehicle by ID
GET /api/collections/tesla_vehicles/records/{id}

### Filter Vehicles
GET /api/collections/tesla_vehicles/records?filter=(model='Model 3')

### Sort Vehicles
GET /api/collections/tesla_vehicles/records?sort=-base_price_usd

### Search Vehicles
GET /api/collections/tesla_vehicles/records?filter=(model~'Model')

## Example Queries

### Get all active vehicles
GET /api/collections/tesla_vehicles/records?filter=(production_status='Active')

### Get vehicles under $50,000
GET /api/collections/tesla_vehicles/records?filter=(base_price_usd<50000)

### Get SUVs sorted by range
GET /api/collections/tesla_vehicles/records?filter=(vehicle_type='SUV')&sort=-range_miles

### Get vehicles with FSD capability
GET /api/collections/tesla_vehicles/records?filter=(fsd_capable=true)
`;

    fs.writeFileSync(path.join(__dirname, 'API_DOCUMENTATION.md'), apiDocs);
    console.log('✅ API documentation created');
  }

  async run(): Promise<void> {
    try {
      console.log('🔧 Starting Tesla Data Setup for PocketBase\n');
      
      await this.downloadPocketBase();
      await this.startPocketBase();
      await this.createAdmin();
      await this.createTeslaVehiclesCollection();
      await this.populateTeslaData();
      await this.createApiEndpoints();
      
      console.log('\n🎉 Setup Complete!');
      console.log('📍 PocketBase Admin: http://127.0.0.1:8090/_/');
      console.log(`📧 Admin Email: ${ADMIN_EMAIL}`);
      console.log(`🔑 Admin Password: ${ADMIN_PASSWORD}`);
      console.log('📚 API Documentation: ./API_DOCUMENTATION.md');
      console.log('\n💡 Next steps:');
      console.log('   1. Visit the admin panel to view your data');
      console.log('   2. Use the API endpoints to query Tesla vehicles');
      console.log('   3. Add more collections for related data (charging stations, stock prices, etc.)');
      
    } catch (error) {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    }
  }
}

// Run the setup
const setup = new PocketBaseSetup();
setup.run();
