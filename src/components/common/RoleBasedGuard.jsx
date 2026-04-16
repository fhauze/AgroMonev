import { Navigate, Outlet } from "react-router-dom";


const RoleBasedGuard = ({allowedRoles}) => {
    const userStorage = localStorage.getItem('user_data');
    const user = userStorage ? JSON.parse(userStorage) : null;

    if(!user){
        return <Navigate to="/login" replace/>
    }

    if(user.role == 'super_admin'){
        return <Outlet/>;
    }

    if(!allowedRoles.includes(user.role)){
        return user.role === 'farmer' 
        ? <Navigate to="/FarmerPortal" replace/>
        : <Navigate to="/unauthorized" replace/>
    }

    return <Outlet/>;
}
export default RoleBasedGuard;