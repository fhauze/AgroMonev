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
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx'
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": {component: Dashboard, roles:['super_admin']},
    "Farmers": {component: Farmers, roles: ['super_admin']},
    "FarmerRegister": {component: FarmerRegister, roles:['super_admin']},
    "FarmerDetail": {component: FarmerDetail, roles: ['super_admin']},
    "Lands": {component: Lands, roles:['super_admin']},
    "LandRegister": {component: LandRegister, roles:['super_admin']},
    "LandDetail": {component: LandDetail, roles:['super_admin', 'petani']},
    "Plants": {component: Plants, roles:['super_admin']},
    "FarmerPortal": {component: FarmerPortal, roles:['super_admin', 'petani']},
    "Validators": {component: Validators, roles: ['super_admin']},
    "ValidatorPortal": {component: ValidatorPortal, roles: ['super_admin']},
    "Offtakers": {component: Offtakers, roles: ['super_admin']},
    "OfftakerPortal": {component: OfftakerPortal, roles: 'super_admin'},
    "ProductivityMonitoring": {component: ProductivityMonitoring, roles:['super_admin', 'petani']},
    "Login": {component: Login, roles:[]},
    "Register": {component: Register, roles:[]},
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};