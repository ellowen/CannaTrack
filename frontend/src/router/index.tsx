import { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import Layout from '@/components/ui/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import SignUp from '@/pages/SignUp'
import Landing from '@/pages/Landing'

// Code splitting: solo el camino critico (landing/login/signup/home) va en
// el bundle principal. El resto de la app se carga bajo demanda — Layout
// envuelve el <Outlet/> en un <Suspense>, asi que estas rutas muestran el
// PageLoader mientras baja su chunk la primera vez que se visitan.
const Dashboard    = lazy(() => import('@/pages/Dashboard'))
const NewPlant     = lazy(() => import('@/pages/NewPlant'))
const PlantDetail  = lazy(() => import('@/pages/PlantDetail'))
const EditPlant    = lazy(() => import('@/pages/EditPlant'))
const Calendar     = lazy(() => import('@/pages/Calendar'))
const Settings     = lazy(() => import('@/pages/Settings'))
const Profile      = lazy(() => import('@/pages/Profile'))
const CustomTable  = lazy(() => import('@/pages/CustomTable'))
const PlantBrowser = lazy(() => import('@/pages/PlantBrowser'))
const Diagnose     = lazy(() => import('@/pages/Diagnose'))
const Inventory    = lazy(() => import('@/pages/Inventory'))

export const router = createBrowserRouter([
  {
    path: '/landing',
    element: <Landing />,
  },
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
