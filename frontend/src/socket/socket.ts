import { io, Socket } from 'socket.io-client';
import { useUIStore } from '../store/uiStore';

let socket: Socket | null = null;

export const connectSocket = () => {
  if (socket?.connected) return socket;

  socket = io('https://crm-3-p5xh.onrender.com', {
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket?.id);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected');
  });

  socket.on('deal_stage_changed', (data: { deal_id: string; title: string; new_stage: string; changed_by: string }) => {
    useUIStore.getState().addToast({
      type: 'info',
      title: 'Deal Updated',
      message: `"${data.title}" moved to ${data.new_stage} by ${data.changed_by}`,
    });
  });

  socket.on('payment_update', (data: { status: string; message: string; plan: string; sub_end: string }) => {
    useUIStore.getState().addToast({
      type: 'success',
      title: 'Payment Successful!',
      message: data.message,
    });
  });

  socket.on('user_deactivated', () => {
    useUIStore.getState().addToast({
      type: 'error',
      title: 'Account Deactivated',
      message: 'Your account has been deactivated. You will be logged out.',
    });
    setTimeout(() => {
      window.location.href = '/login';
    }, 2000);
  });

  socket.on('lead_assigned', (data: { contact_id: string; contact_name: string; assigned_by: string }) => {
    useUIStore.getState().addToast({
      type: 'info',
      title: 'New Lead Assigned',
      message: `You've been assigned "${data.contact_name}" by ${data.assigned_by}`,
    });
  });

  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = () => socket;
