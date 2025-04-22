import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import PrivateRoute from './components/PrivateRoute'
import OnlyIssueInchargePrivateRoute from './components/OnlyIssueInchargePrivateRoute'
import OnlyAdminPrivateRoute from './components/OnlyAdminPrivateRoute'
import Profile from './pages/Profile'
import ComplaintPage from './pages/ComplaintPage'
import RoleBasedRoute from './components/RoleBasedRoute'
import IssueInchargeDashboard from './pages/IssueInchargeDashboard'
import AdminDashboard from './pages/AdminDashboard'
import Dashboard from './pages/Dashboard'
import ManageComplaints from './pages/ManageComplaints'
import ManageTags from './pages/ManageTags'
import ManageLocations from './pages/ManageLocations'
import ManageAllUsers from './pages/ManageAllUsers'
import Notifications from './pages/Notifications'
import InchargeManageComplaints from './pages/InchargeManageComplaints'
import InchargeComplaintPage from './pages/InchargeComplaintPage'
import InchargeProfile from './pages/InchargeProfile'
import InchargeNotifications from './pages/InchargeNotifications'
import ManageProfessions from './pages/ManageProfessions'
import NotFound from './pages/NotFound'

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sign-in" element={<SignIn/>}/>
        <Route path="sign-up" element={<SignUp/>}/>
        <Route path="/role-redirect" element={<RoleBasedRoute />} />
        {/* Private Routes */}
        <Route element={<PrivateRoute />}>
          <Route path='/' element={<Home/>}/>
          <Route path='/profile' element={<Profile/>}/>
          <Route path='/complaint/:complaintId' element={<ComplaintPage />}/>
          <Route path='/dashboard' element={<Dashboard/>}/>
          <Route path='/notifications' element={<Notifications />}/>
        </Route>

        {/* Issue Incharge Routes */} 
        <Route element={<OnlyIssueInchargePrivateRoute />}>
          <Route
            path="/incharge/dashboard"
            element={<IssueInchargeDashboard />}
          />
          <Route path="/incharge/complaints" element={<InchargeManageComplaints />}/>
          <Route path="/incharge/complaint/:complaintId" element={<InchargeComplaintPage />} />
          <Route path="/incharge/profile" element={<InchargeProfile />} />
          <Route path="/incharge/notifications" element={<InchargeNotifications />} />
        </Route>

        {/* Admin Routes */}
        <Route element={<OnlyAdminPrivateRoute />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/complaints" element={<ManageComplaints />} />
          <Route path="/admin/users" element={<ManageAllUsers />} />
          <Route path="/admin/tags" element={<ManageTags />} />
          <Route path="/admin/locations" element={<ManageLocations />} />
          <Route path="/admin/professions" element={<ManageProfessions />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
