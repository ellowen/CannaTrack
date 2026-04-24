import { createBrowserRouter } from 'react-router-dom'
import Layout from '@/components/ui/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Home from '@/pages/Home'
import Dashboard from '@/pages/Dashboard'
import NewPlant from '@/pages/NewPlant'
import PlantDetail from '@/pages/PlantDetail'
import EditPlant from '@/pages/EditPlant'
import Calendar from '@/pages/Calendar'
import Settings from '@/pages/Settings'
import Profile from '@/pages/Profile'
import CustomTable from '@/pages/CustomTable'
import PlantBrowser from '@/pages/PlantBrowser'
import Diagnose from '@/pages/Diagnose'
import Inventory from '@/pages/Inventory'
import Login from '@/pages/Login'
import SignUp from '@/pages/SignUp'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <SignUp />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Home /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'plants', element: <PlantBrowser /> },
      { path: 'plants/new', element: <NewPlant /> },
      { path: 'plants/:id', element: <PlantDetail /> },
      { path: 'plants/:id/edit', element: <EditPlant /> },
      { path: 'inventory', element: <Inventory /> },
      { path: 'calendar', element: <Calendar /> },
      { path: 'diagnose', element: <Diagnose /> },
      { path: 'settings', element: <Settings /> },
      { path: 'profile', element: <Profile /> },
      { path: 'nutrition/new', element: <CustomTable /> },
    ],
  },
])
