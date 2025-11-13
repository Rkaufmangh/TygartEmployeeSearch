import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../logic/AuthContext';

const Home = () => {
	const navigate = useNavigate();
	const context = useContext<AuthContext | null>(AuthContext);
	
	return (
		<div className="flex flex-col min-h-screen">
			
			<h2>Employee Portal</h2>
			<p>Welcome to the employee portal. This is a database for the management to store, retrieve and search employee data.</p>
			{!context?.currentUser ?
				<button onClick={() => navigate("/login")}>Sign In</button> : <></>
			}

		</div>
		
	);
};

export default Home;