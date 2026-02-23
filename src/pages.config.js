/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Dashboard from './pages/Dashboard';
import Farmers from './pages/Farmers';
import FarmerRegister from './pages/FarmerRegister';
import FarmerDetail from './pages/FarmerDetail';
import Lands from './pages/Lands';
import LandRegister from './pages/LandRegister';
import LandDetail from './pages/LandDetail';
import Validators  from './pages/Validators';
import ValidatorPortal from './pages/ValidatorPortal';
import Plants from './pages/Plants';
import FarmerPortal from './pages/FarmerPortal';
import Offtakers from './pages/Offtakers';
import OfftakerPortal from './pages/OfftakerPortal';
import ProductivityMonitoring from './pages/ProductivityMonitoring';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Farmers": Farmers,
    "FarmerRegister": FarmerRegister,
    "FarmerDetail": FarmerDetail,
    "Lands": Lands,
    "LandRegister": LandRegister,
    "LandDetail": LandDetail,
    "Plants": Plants,
    "FarmerPortal": FarmerPortal,
    "Validators": Validators,
    "ValidatorPortal": ValidatorPortal,
    "Offtakers": Offtakers,
    "OfftakerPortal": OfftakerPortal,
    "ProductivityMonitoring": ProductivityMonitoring
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};