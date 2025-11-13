import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from '../firebase/firebase';

const SignOutPage = () => {
  const navigate = useNavigate();
  useEffect(() => {
    signOut().finally(() => navigate('/login'));
  }, []);
  return null;
};

export default SignOutPage;

