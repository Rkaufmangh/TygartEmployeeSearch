import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from "./logic/AuthContext";
import { EmployeeProvider } from './logic/EmployeeContext.tsx';

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<Router>
			<AuthProvider>
				<EmployeeProvider>
					<App />
				</EmployeeProvider>
			</AuthProvider>
		</Router>
	</StrictMode>,
)
