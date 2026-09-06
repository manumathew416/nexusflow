import React, { useEffect, useRef, useState } from 'react';
import Navbar from './components/layout/Navbar';
import StatusBar from './components/layout/StatusBar';
import NexusCanvas from './components/canvas/NexusCanvas';
import LiveTelemetryChart from './components/dashboard/LiveTelemetryChart';
import AlertsFeed from './components/dashboard/AlertsFeed';
import DeviceGrid from './components/dashboard/DeviceGrid';
import SimulatorControl from './components/dashboard/SimulatorControl';
import { triggerAnomaly } from './services/api';
import {
  CheckCircle,
  AlertTriangle,
  Info,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  const [activeTab, setActiveTab] = useState('canvas');
  const [notification, setNotification] = useState(null);

  // Keep track of the current notification timer.
  const notificationTimerRef = useRef(null);

  const showNotification = ({
    type = 'info',
    message
  }) => {
    // Clear the previous timer before creating a new one.
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }

    const notificationId =
      `${Date.now()}-${Math.random()}`;

    setNotification({
      type,
      message,
      id: notificationId
    });

    notificationTimerRef.current =
      setTimeout(() => {
        setNotification((previous) => {
          if (
            previous &&
            previous.id === notificationId
          ) {
            return null;
          }

          return previous;
        });

        notificationTimerRef.current = null;
      }, 4500);
  };

  // Clean up the timer when App unmounts.
  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) {
        clearTimeout(
          notificationTimerRef.current
        );
      }
    };
  }, []);

  const closeNotification = () => {
    if (notificationTimerRef.current) {
      clearTimeout(
        notificationTimerRef.current
      );

      notificationTimerRef.current = null;
    }

    setNotification(null);
  };

  const handleQuickDemoSpike = async () => {
    try {
      await triggerAnomaly({
        deviceId: 'turbine-01',
        metric: 'temperature',
        magnitude: 38,
        durationSec: 10,
        type: 'spike'
      });

      showNotification({
        type: 'warning',
        message:
          '⚡ Anomaly Injected: +38°C Spike on Turbine-01! Watch the canvas & alerts react.'
      });

      confetti({
        particleCount: 40,
        spread: 70,
        origin: {
          y: 0.1
        }
      });
    } catch (err) {
      console.error(
        'Failed to inject anomaly:',
        err
      );

      showNotification({
        type: 'error',
        message:
          'Failed to inject anomaly. Make sure the backend server is running.'
      });
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#090d16] text-slate-100 overflow-hidden font-sans">

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onTriggerQuickDemo={
          handleQuickDemoSpike
        }
      />

      {/* Main View Area */}
      <main className="flex-1 overflow-hidden relative">

        {activeTab === 'canvas' && (
          <NexusCanvas
            onNotification={
              showNotification
            }
          />
        )}

        {activeTab === 'dashboard' && (
          <div className="h-full w-full p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-6 bg-[#090d16]">

            <div className="lg:col-span-2 h-[550px]">
              <LiveTelemetryChart />
            </div>

            <div className="h-[550px]">
              <SimulatorControl
                onNotification={
                  showNotification
                }
              />
            </div>

            <div className="lg:col-span-3 h-[420px]">
              <AlertsFeed
                onNotification={
                  showNotification
                }
              />
            </div>

          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="h-full w-full p-6 overflow-hidden bg-[#090d16]">
            <AlertsFeed
              onNotification={
                showNotification
              }
            />
          </div>
        )}

        {activeTab === 'devices' && (
          <div className="h-full w-full p-6 overflow-hidden bg-[#090d16]">
            <DeviceGrid />
          </div>
        )}

        {/* Global Toast Notification */}
        {notification && (
          <div className="fixed bottom-12 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl shadow-black/80 animate-slideUp max-w-md">

            {notification.type === 'success' && (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            )}

            {notification.type === 'warning' && (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            )}

            {notification.type === 'error' && (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}

            {notification.type === 'info' && (
              <Info className="w-5 h-5 text-cyan-400 shrink-0" />
            )}

            <p className="text-xs text-slate-200 font-medium flex-1 leading-snug">
              {notification.message}
            </p>

            <button
              type="button"
              onClick={closeNotification}
              className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>

          </div>
        )}

      </main>

      {/* Bottom Status Bar */}
      <StatusBar />

    </div>
  );
}