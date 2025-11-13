import './App.css'
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Home from './pages/home';
import SignIn from './pages/sign-in';
import '@progress/kendo-theme-default/dist/all.css';
import AddEmployee from './pages/add-employee';
import Layout from './layout';
import Employees from './pages/employees';
import Users from './pages/users';
import UserEdit from './pages/user-edit';
import Profile from './pages/profile';
import SignOutPage from './pages/signout';

function App() {
  return (
		<Layout>
			<Routes>
<Route path='/' element={<Home/>}/>
		<Route path='/login' element={<SignIn/>}/>
		<Route path='/employees' element={<Employees/>}/>
		<Route path='/profile' element={<Profile/>}/>
		<Route path='/signout' element={<SignOutPage/>}/>
		<Route path='/addemployee' element={<AddEmployee/>}/>
		<Route path='/users' element={<Users/>}/>
		<Route path='/users/add' element={<UserEdit/>}/>
		<Route path='/users/edit' element={<UserEdit/>}/>
		</Routes>
		</Layout>
  )
}

export default App
