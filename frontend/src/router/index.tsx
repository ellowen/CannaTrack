import { createBrowserRouter } from 'react-router-dom'
import Layout from '@/components/ui/Layout'
import Home from '@/pages/Home'
import NewPlant from '@/pages/NewPlant'
import PlantDetail from '@/pages/PlantDetail'
import Calendar from '@/pages/Calendar'
import Settings from '@/pages/Settings'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'plants/new', element: <NewPlant /> },
      { path: 'plants/:id', element: <PlantDetail /> },
      { path: 'calendar', element: <Calendar /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
])
