// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import { Bell, Download, Wifi, WifiOff, Settings, BellRing } from 'lucide-react';

export default function BillBuddy() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [personalExpenses, setPersonalExpenses] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [menu, setMenu] = useState<string>('group');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [installPrompt, setInstallPrompt] = useState<any | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const [userName, setUserName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [splitBetween, setSplitBetween] = useState<string[]>([]);
  const [settleUser, setSettleUser] = useState<string>('');
  const [settleAmount, setSettleAmount] = useState<string>('');

  // IndexedDB Helper Functions
  const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
  const request = indexedDB.open('BillBuddyDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('expenses')) {
          db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('personalExpenses')) {
          db.createObjectStore('personalExpenses', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('settlements')) {
          db.createObjectStore('settlements', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  };

  const saveToIndexedDB = async (storeName: string, data: any) => {
    try {
      const db = await openDB();
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      if (Array.isArray(data)) {
        // clear and add items - don't await IDBRequest directly, instead wait for transaction completion
        store.clear();
        for (const item of data) {
          store.add(item);
        }
      } else {
        store.put(data);
      }

      // Wait for transaction to complete
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Error saving to IndexedDB:', error);
    }
  };

  const loadFromIndexedDB = async (storeName: string): Promise<any[]> => {
    try {
      const db = await openDB();
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      return await new Promise<any[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error loading from IndexedDB:', error);
      return [];
    }
  };

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      const [loadedExpenses, loadedPersonal, loadedSettlements, loadedUsers] = await Promise.all([
        loadFromIndexedDB('expenses'),
        loadFromIndexedDB('personalExpenses'),
        loadFromIndexedDB('settlements'),
        loadFromIndexedDB('users')
      ]);
      
      setExpenses(loadedExpenses);
      setPersonalExpenses(loadedPersonal);
      setSettlements(loadedSettlements);
      setUsers(loadedUsers.map(u => u.name || u));
    };
    
    loadData();
  }, []);

  // Save data when state changes
  useEffect(() => {
    if (expenses.length >= 0) saveToIndexedDB('expenses', expenses);
  }, [expenses]);
  
  useEffect(() => {
    if (personalExpenses.length >= 0) saveToIndexedDB('personalExpenses', personalExpenses);
  }, [personalExpenses]);
  
  useEffect(() => {
    if (settlements.length >= 0) saveToIndexedDB('settlements', settlements);
  }, [settlements]);
  
  useEffect(() => {
    if (users.length >= 0) saveToIndexedDB('users', users.map(name => ({ name })));
  }, [users]);

  // Online/Offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Notification Setup
  useEffect(() => {
    const checkNotificationPermission = () => {
      if ('Notification' in window) {
        setNotificationsEnabled(Notification.permission === 'granted');
      }
    };
    
    checkNotificationPermission();
  }, []);

  // Daily expense reminder
  useEffect(() => {
    if (notificationsEnabled) {
      const checkDailyExpenses = () => {
        const today = new Date();
        const todayExpenses = personalExpenses.filter(exp => {
          const expDate = new Date(exp.year, exp.month, exp.day || 1);
          return expDate.toDateString() === today.toDateString();
        });

        if (todayExpenses.length === 0 && today.getHours() === 20) {
          sendNotification('Daily Expense Reminder', "Don't forget to log your expenses today!");
        }
      };

      const interval = setInterval(checkDailyExpenses, 3600000); // Check every hour
      return () => clearInterval(interval);
    }
  }, [notificationsEnabled, personalExpenses]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      
      if (permission === 'granted') {
  sendNotification('BillBuddy Notifications Enabled!', 'You\'ll now receive expense reminders.');
      }
    }
  };

  const sendNotification = (title, body) => {
    if (notificationsEnabled && 'Notification' in window) {
      new Notification(title, {
        body,
        icon: '/icon-192.png',
        tag: 'expense-reminder',
        badge: '/icon-192.png'
      });
    }
  };

  const installPWA = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((result) => {
        if (result.outcome === 'accepted') {
          console.log('PWA installed');
        }
        setInstallPrompt(null);
      });
    }
  };

  const addUser = () => {
    if (userName.trim() !== '') {
      setUsers([...users, userName]);
      setUserName('');
      sendNotification('New User Added', `${userName} has been added to the group!`);
    }
  };

  const addExpense = () => {
    if (description.trim() && amount && splitBetween.length > 0) {
      const newExpense = {
        description,
        amount: parseFloat(amount),
        splitBetween,
        date: new Date().toISOString(),
        id: Date.now()
      };
      setExpenses([...expenses, newExpense]);
      setDescription('');
      setAmount('');
      setSplitBetween([]);
      sendNotification('Expense Added', `${description}: ₹${amount} split between ${splitBetween.join(', ')}`);
    }
  };

  const addPersonalExpense = () => {
    if (description.trim() && amount && category.trim()) {
      const now = new Date();
      const newExpense = {
        description,
        amount: parseFloat(amount),
        category,
        month: now.getMonth(),
        year: now.getFullYear(),
        day: now.getDate(),
        date: now.toISOString(),
        id: Date.now()
      };
      setPersonalExpenses([...personalExpenses, newExpense]);
      setDescription('');
      setAmount('');
      setCategory('');
      sendNotification('Personal Expense Added', `${description}: ₹${amount} in ${category}`);
    }
  };

  const addSettlement = () => {
    if (settleUser && settleAmount) {
      const newSettlement = {
        user: settleUser,
        amount: parseFloat(settleAmount),
        date: new Date().toISOString(),
        id: Date.now()
      };
      setSettlements([...settlements, newSettlement]);
      setSettleUser('');
      setSettleAmount('');
      sendNotification('Settlement Recorded', `₹${settleAmount} settled by ${settleUser}`);
    }
  };

  const toggleUserForSplit = (user) => {
    setSplitBetween(splitBetween.includes(user) ? splitBetween.filter(u => u !== user) : [...splitBetween, user]);
  };

  const getUserTotal = (user) => {
    let total = 0;
    expenses.forEach(exp => {
      if (exp.splitBetween.includes(user)) total += exp.amount / exp.splitBetween.length;
    });
    settlements.forEach(set => {
      if (set.user === user) total -= set.amount;
    });
    return total.toFixed(2);
  };

  // Filter personal expenses by selected month
  const filteredPersonal = personalExpenses.filter(exp => exp.month === selectedMonth);

  // group personal expenses by category
  const groupedByCategory = filteredPersonal.reduce((acc, exp) => {
    if (!acc[exp.category]) acc[exp.category] = [];
    acc[exp.category].push(exp);
    return acc;
  }, {});

  // Prepare monthly data for line chart
  const monthlyData = Array.from({length: 12}, (_, monthIndex) => {
    const monthExpenses = personalExpenses.filter(exp => exp.month === monthIndex);
    const total = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    return {
      month: new Date(0, monthIndex).toLocaleString('default', {month: 'short'}),
      amount: total,
      count: monthExpenses.length
    };
  });

  // Current month data for pie chart
  const currentMonth = new Date().getMonth();
  const currentMonthExpenses = personalExpenses.filter(exp => exp.month === currentMonth);
  const currentMonthGrouped = currentMonthExpenses.reduce((acc, exp) => {
    if (!acc[exp.category]) acc[exp.category] = [];
    acc[exp.category].push(exp);
    return acc;
  }, {});

  const currentMonthChartData = Object.entries(currentMonthGrouped).map(([category, expenses]) => ({
    name: category,
    value: expenses.reduce((sum, exp) => sum + exp.amount, 0),
    count: expenses.length
  }));

  const currentMonthTotal = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Prepare data for charts
  const chartData = Object.entries(groupedByCategory).map(([category, expenses]) => ({
    name: category,
    value: expenses.reduce((sum, exp) => sum + exp.amount, 0),
    count: expenses.length
  }));

  const totalPersonalExpense = filteredPersonal.reduce((sum, exp) => sum + exp.amount, 0);

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0', '#ffb347', '#87ceeb'];

  return (
    <div className={darkMode 
      ? 'bg-black text-white min-h-screen p-6' 
      : 'bg-gradient-to-br from-green-100 via-blue-100 to-purple-200 text-gray-900 min-h-screen p-6'}>
      <div className="max-w-3xl mx-auto">
        {/* Header with PWA controls */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">BillBuddy</h1>
            <div className="flex items-center gap-1">
              {isOnline ? <Wifi className="w-5 h-5 text-green-500" /> : <WifiOff className="w-5 h-5 text-red-500" />}
              <span className="text-sm text-gray-500">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {installPrompt && (
              <button 
                onClick={installPWA}
                className="px-3 py-2 rounded-2xl bg-blue-500 text-white shadow-md hover:shadow-lg transition flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                Install
              </button>
            )}
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="px-3 py-2 rounded-2xl bg-gray-500 text-white shadow-md hover:shadow-lg transition"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PWA Settings Panel */}
        {showSettings && (
          <div className="bg-white/10 backdrop-blur-sm dark:bg-gray-900/90 p-6 rounded-2xl shadow-lg mb-6">
            <h2 className="text-xl font-semibold mb-4">App Settings</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">Push Notifications</div>
                  <div className="text-sm text-gray-500">Get expense reminders and updates</div>
                </div>
                <button
                  onClick={requestNotificationPermission}
                  className={`px-4 py-2 rounded-2xl transition flex items-center gap-2 ${
                    notificationsEnabled 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-500 text-white hover:bg-blue-500'
                  }`}
                >
                  {notificationsEnabled ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                  {notificationsEnabled ? 'Enabled' : 'Enable'}
                </button>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">Storage Status</div>
                  <div className="text-sm text-gray-500">Data stored offline in your device</div>
                </div>
                <div className="text-green-500 font-medium">✓ Active</div>
              </div>

              {!isOnline && (
                <div className="p-3 bg-yellow-500/20 rounded-2xl">
                  <div className="font-medium text-yellow-600 dark:text-yellow-400">Offline Mode</div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-400">You're offline. Data will sync when connection returns.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-center gap-2 mb-6">
          <button onClick={() => setMenu('group')} className={`px-4 py-2 rounded-2xl ${menu==='group'?'bg-gradient-to-r from-indigo-500 to-purple-500 text-white':'bg-gray-300 text-gray-800 dark:bg-gray-800 dark:text-white'}`}>Group</button>
          <button onClick={() => setMenu('personal')} className={`px-4 py-2 rounded-2xl ${menu==='personal'?'bg-gradient-to-r from-green-500 to-emerald-500 text-white':'bg-gray-300 text-gray-800 dark:bg-gray-800 dark:text-white'}`}>Personal</button>
          <button onClick={() => setDarkMode(!darkMode)} className={`px-4 py-2 rounded-2xl shadow-md hover:shadow-lg transition ${darkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>
            {darkMode ? 'Light' : 'Dark'}
          </button>
        </div>

        {menu==='group' && (
        <>
          <div className="bg-white/10 backdrop-blur-sm dark:bg-gray-900/90 p-6 rounded-2xl shadow-lg mb-6">
            <h2 className="text-xl font-semibold mb-4">Add User</h2>
            <div className="flex gap-2">
              <input value={userName} onChange={e => setUserName(e.target.value)} placeholder="User name" className="flex-1 px-3 py-2 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:text-white dark:border-gray-600" />
              <button onClick={addUser} className="px-4 py-2 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md hover:shadow-lg transition">Add</button>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm dark:bg-gray-900/90 p-6 rounded-2xl shadow-lg mb-6">
            <h2 className="text-xl font-semibold mb-4">Add Group Expense</h2>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className="w-full mb-3 px-3 py-2 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:text-white dark:border-gray-600" />
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" className="w-full mb-3 px-3 py-2 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:text-white dark:border-gray-600" />
            <div className="mb-4">
              <h3 className="font-medium mb-2">Split between:</h3>
              <div className="flex flex-wrap gap-2">
                {users.map(user => (
                  <button key={user} onClick={() => toggleUserForSplit(user)} className={`px-3 py-1 rounded-2xl transition ${splitBetween.includes(user) ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-white'}`}>
                    {user}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={addExpense} className="w-full px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md hover:shadow-lg transition">Add Expense</button>
          </div>

          <div className="bg-white/10 backdrop-blur-sm dark:bg-gray-900/90 p-6 rounded-2xl shadow-lg mb-6">
            <h2 className="text-xl font-semibold mb-4">Add Settlement</h2>
            <div className="flex gap-2 mb-3">
              <select value={settleUser} onChange={e => setSettleUser(e.target.value)} className="flex-1 px-3 py-2 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-400 dark:bg-gray-800 dark:text-white dark:border-gray-600">
                <option value="">Select user</option>
                {users.map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
              <input type="number" value={settleAmount} onChange={e => setSettleAmount(e.target.value)} placeholder="Amount" className="flex-1 px-3 py-2 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-400 dark:bg-gray-800 dark:text-white dark:border-gray-600" />
            </div>
            <button onClick={addSettlement} className="w-full px-4 py-2 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md hover:shadow-lg transition">Add Settlement</button>
          </div>

          <div className="bg-white/10 backdrop-blur-sm dark:bg-gray-900/90 p-6 rounded-2xl shadow-lg mb-6">
            <h2 className="text-xl font-semibold mb-4">User Balances</h2>
            {users.length === 0 && <p className="text-gray-500">No users added yet.</p>}
            {users.map(user => (
              <div key={user} className="flex justify-between items-center p-3 mb-2 bg-gradient-to-r from-blue-200/30 to-purple-200/30 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-md">
                <span className="font-medium">{user}</span>
                <span className={`font-bold ${parseFloat(getUserTotal(user)) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  ₹{getUserTotal(user)}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-white/10 backdrop-blur-sm dark:bg-gray-900/90 p-6 rounded-2xl shadow-lg mb-6">
            <h2 className="text-xl font-semibold mb-4">Group Expenses</h2>
            {expenses.length === 0 && <p className="text-gray-500">No expenses added yet.</p>}
            {expenses.map((exp, index) => (
              <div key={index} className="p-3 mb-2 bg-gradient-to-r from-green-200/30 to-blue-200/30 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-md">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{exp.description}</span>
                  <span className="font-bold">₹{exp.amount}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Split between: {exp.splitBetween.join(', ')} (₹{(exp.amount / exp.splitBetween.length).toFixed(2)} each)
                </div>
              </div>
            ))}
          </div>
        </>
        )}

        {menu==='personal' && (
        <>
        <div className="bg-white/10 backdrop-blur-sm dark:bg-gray-900/90 p-6 rounded-2xl shadow-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Add Personal Monthly Expense</h2>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className="w-full mb-3 px-3 py-2 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:text-white dark:border-gray-600" />
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" className="w-full mb-3 px-3 py-2 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800 dark:text-white dark:border-gray-600" />
          <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Category (e.g. Food, Rent)" className="w-full mb-3 px-3 py-2 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 dark:bg-gray-800 dark:text-white dark:border-gray-600" />
          <button onClick={addPersonalExpense} className="w-full px-4 py-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md hover:shadow-lg transition">Add Personal Expense</button>
        </div>

        <div className="flex gap-4 mb-6 items-center">
          <label className="font-semibold">Select Month:</label>
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="px-3 py-2 rounded-2xl border dark:bg-gray-800 dark:text-white dark:border-gray-600">
            {Array.from({length:12},(_,i)=>i).map(m=>(
              <option key={m} value={m}>{new Date(0,m).toLocaleString('default',{month:'long'})}</option>
            ))}
          </select>
        </div>

        <div className="bg-white/10 backdrop-blur-sm dark:bg-gray-900/90 p-6 rounded-2xl shadow-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Monthly Expense Trends</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'amount' ? `₹${value}` : value, 
                  name === 'amount' ? 'Amount' : 'Number of Expenses'
                ]} 
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#8884d8" 
                strokeWidth={3}
                dot={{ r: 6 }}
                name="Monthly Amount (₹)"
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#82ca9d" 
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Number of Expenses"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white/10 backdrop-blur-sm dark:bg-gray-900/90 p-6 rounded-2xl shadow-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Month Overview</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex flex-col justify-center">
              <h3 className="text-lg font-medium mb-4 text-center">
                {new Date().toLocaleString('default', {month: 'long', year: 'numeric'})} Expenses
              </h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-500 mb-2">
                  ₹{currentMonthTotal.toFixed(2)}
                </div>
                <div className="text-sm text-gray-400">
                  {currentMonthExpenses.length} expenses this month
                </div>
                {currentMonthChartData.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-medium text-sm">Top Categories:</h4>
                    {currentMonthChartData
                      .sort((a, b) => b.value - a.value)
                      .slice(0, 3)
                      .map((item, index) => (
                        <div key={item.name} className="flex justify-between text-sm">
                          <span className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded mr-2" 
                              style={{backgroundColor: COLORS[index % COLORS.length]}}
                            ></div>
                            {item.name}
                          </span>
                          <span>₹{item.value.toFixed(0)}</span>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2 text-center">Category Distribution</h3>
              {currentMonthChartData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  No expenses for current month
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={currentMonthChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => 
                        percent > 5 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                      }
                    >
                      {currentMonthChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`₹${value}`, 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm dark:bg-gray-900/90 p-6 rounded-2xl shadow-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Selected Month Analysis (
            {new Date(0, selectedMonth).toLocaleString('default', {month: 'long'})}
          )</h2>
          <div className="text-2xl font-bold text-blue-500 mb-4">₹{totalPersonalExpense.toFixed(2)}</div>
          {chartData.length === 0 ? (
            <p className="text-gray-500">No expenses to display for selected month.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-2 text-center">Expenses by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`₹${value}`, 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2 text-center">Category Breakdown</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [name === 'value' ? `₹${value}` : value, name === 'value' ? 'Amount' : 'Count']} 
                    />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" name="Amount (₹)" />
                    <Bar dataKey="count" fill="#82ca9d" name="Number of Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white/10 backdrop-blur-sm dark:bg-gray-900/90 p-6 rounded-2xl shadow-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Personal Expenses by Category</h2>
          {Object.keys(groupedByCategory).length === 0 && <p className="text-gray-500">No personal expenses for selected month.</p>}
          {Object.entries(groupedByCategory).map(([cat, exps]) => (
            <div key={cat} className="mb-4">
              <h3 className="text-lg font-medium mb-2 text-emerald-400">{cat}</h3>
              <div className="text-sm text-gray-400 mb-2">Total: ₹{exps.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}</div>
              <ul className="space-y-2">
                {exps.map((exp, index) => (
                  <li key={index} className="p-3 bg-gradient-to-r from-blue-200/30 to-green-200/30 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-md flex justify-between">
                    <span>{exp.description}</span>
                    <span className="font-medium">₹{exp.amount}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        </>
        )}
      </div>
    </div>
  );
}