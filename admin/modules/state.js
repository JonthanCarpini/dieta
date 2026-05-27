/**
 * state.js — Estado global compartilhado e configurações
 */

export const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000/api' 
    : '/api';

export const adminState = {
    token: localStorage.getItem('nutrir_token') || '',
    user: null,
    users: [],
    plans: [],
    settings: {},
    editingPlanId: null,
    _targetMealDow: null,
    _targetMealType: null,
    _editingPlanData: null,
    _editingPlanActive: true
};
