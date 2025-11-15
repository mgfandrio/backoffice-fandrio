import React from 'react';
import LoginForm from '../components/LoginForm';

const LoginPage = () => {
  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold text-center justify-center mb-4">
            Fandrio Dashboard
          </h2>
          <LoginForm />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
