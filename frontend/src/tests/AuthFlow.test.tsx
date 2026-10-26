import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';

const TestAuthConsumer: React.FC = () => {
  const { user, token, isAuthenticated, loginAsDemo, logout } = useAuth();
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'guest'}</div>
      <div data-testid="user-name">{user ? user.displayName : 'none'}</div>
      <div data-testid="token">{token || 'no-token'}</div>
      <button onClick={loginAsDemo} data-testid="demo-btn">Demo Login</button>
      <button onClick={() => logout()} data-testid="logout-btn">Logout</button>
    </div>
  );
};

describe('Authentication Flow & Guest Safety', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts unauthenticated visitors as guests without forced demo account', async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    // Initial state must be unauthenticated / guest
    expect(screen.getByTestId('auth-status').textContent).toBe('guest');
    expect(screen.getByTestId('user-name').textContent).toBe('none');
    expect(screen.getByTestId('token').textContent).toBe('no-token');
  });

  it('allows explicit demo login when requested by user', async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    act(() => {
      screen.getByTestId('demo-btn').click();
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');
    expect(screen.getByTestId('user-name').textContent).toBe('Explorer Alex');
    expect(screen.getByTestId('token').textContent).toBe('demo-token');
  });

  it('clears credentials completely upon logout', async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    act(() => {
      screen.getByTestId('demo-btn').click();
    });
    expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');

    await act(async () => {
      screen.getByTestId('logout-btn').click();
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('guest');
    expect(screen.getByTestId('user-name').textContent).toBe('none');
    expect(localStorage.getItem('travel_auth_mode')).toBeNull();
    expect(localStorage.getItem('travel_auth_token')).toBeNull();
  });
});
