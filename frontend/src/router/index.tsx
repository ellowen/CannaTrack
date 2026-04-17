import { createBrowserRouter } from 'react-router-dom'
import Layout from '@/components/ui/Layout'
import Home from '@/pages/Home'
import NewPlant from '@/pages/NewPlant'
import PlantDetail from '@/pages/PlantDetail'
import EditPlant from '@/pages/EditPlant'
import Calendar from '@/pages/Calendar'
import Settings from '@/pages/Settings'
import Profile from '@/pages/Profile'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'plants/new', element: <NewPlant /> },
      { path: 'plants/:id', element: <PlantDetail /> },
      { path: 'plants/:id/edit', element: <EditPlant /> },
      { path: 'calendar', element: <Calendar /> },
      { path: 'settings', element: <Settings /> },
      { path: 'profile', element: <Profile /> },
    ],
  },
])
