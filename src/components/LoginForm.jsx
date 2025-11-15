import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdEmail, MdLock } from 'react-icons/md';
import { AiOutlineEyeInvisible, AiOutlineEye } from 'react-icons/ai';
import { FiLogIn } from 'react-icons/fi';
import AuthService from '../services/auth.service';

const LoginForm = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState({
    identifiant: '',
    motDePasse: ''
  });

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await AuthService.login(credentials);
      if (response.statut) {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      <div className="form-control">
        <label className="label">
          <span className="label-text flex items-center gap-2">
            <MdEmail className="text-lg" /> Identifiant
          </span>
        </label>
        <input
          type="text"
          name="identifiant"
          value={credentials.identifiant}
          onChange={handleChange}
          placeholder='exemple@gmail.com'
          className="input input-bordered"
          required
        />
      </div>
      
      <div className="form-control">
        <label className="label">
          <span className="label-text flex items-center gap-2">
            <MdLock className="text-lg" /> Mot de passe
          </span>
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="motDePasse"
            value={credentials.motDePasse}
            onChange={handleChange}
            placeholder="••••••••"
            className="input input-bordered w-full"
            required
          />
          <button 
            type="button"
            onClick={togglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            {showPassword ? (
              <AiOutlineEyeInvisible className="text-xl text-gray-500" />
            ) : (
              <AiOutlineEye className="text-xl text-gray-500" />
            )}
          </button>
        </div>
        <label className="label">
          <a href="#" className="label-text-alt link link-hover">
            Mot de passe oublié?
          </a>
        </label>
      </div>

      <button 
        className="btn btn-primary w-full mt-4 flex items-center gap-2 justify-center"
        disabled={loading}
      >
        {loading ? (
          <span className="loading loading-spinner"></span>
        ) : (
          <FiLogIn className="text-lg" />
        )}
        {loading ? 'Connexion...' : 'Se connecter'}
      </button>
    </form>
  );
};

export default LoginForm;
