// A modestly-typed version of your component using idb for storage
import React, { useEffect, useState } from 'react'
import { openDB, DBSchema } from 'idb'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts'
import { Bell, Download, Wifi, WifiOff, Settings, BellRing } from 'lucide-react'

interface Expense { id?: number; description: string; amount: number; splitBetween: string[]; date: string }
interface PersonalExpense { id?: number; description: string; amount: number; category: string; month: number; year: number; day: number; date: string }
interface Settlement { id?: number; user: string; amount: number; date: string }

interface BillBuddyDB extends DBSchema {
  expenses: { key: number; value: Expense }
  personalExpenses: { key: number; value: PersonalExpense }
  settlements: { key: number; value: Settlement }
  users: { key: number; value: { id?: number; name: string } }
}

const DB_NAME = 'BillBuddyDB'
const DB_VERSION = 1

export default function BillBuddy(){
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [personalExpenses, setPersonalExpenses] = useState<PersonalExpense[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [users, setUsers] = useState<string[]>([])
  const [darkMode, setDarkMode] = useState<boolean>(false)
  const [menu, setMenu] = useState<string>('group')
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth())
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [installPrompt, setInstallPrompt] = useState<any | null>(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false)
  const [showSettings, setShowSettings] = useState<boolean>(false)

  const [userName, setUserName] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [category, setCategory] = useState<string>('')
  const [splitBetween, setSplitBetween] = useState<string[]>([])
  const [settleUser, setSettleUser] = useState<string>('')
  const [settleAmount, setSettleAmount] = useState<string>('')

  // idb helper
  const getDB = async () => openDB<BillBuddyDB>(DB_NAME, DB_VERSION, {
    upgrade(db){
      if (!db.objectStoreNames.contains('expenses')) db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true })
      if (!db.objectStoreNames.contains('personalExpenses')) db.createObjectStore('personalExpenses', { keyPath: 'id', autoIncrement: true })
      if (!db.objectStoreNames.contains('settlements')) db.createObjectStore('settlements', { keyPath: 'id', autoIncrement: true })
      if (!db.objectStoreNames.contains('users')) db.createObjectStore('users', { keyPath: 'id', autoIncrement: true })
    }
  })

  const saveAll = async () => {
    const db = await getDB()
    const tx = db.transaction(['expenses','personalExpenses','settlements','users'],'readwrite')
    await tx.objectStore('expenses').clear()
    for(const e of expenses) await tx.objectStore('expenses').add(e as any)
    await tx.objectStore('personalExpenses').clear()
    for(const e of personalExpenses) await tx.objectStore('personalExpenses').add(e as any)
    await tx.objectStore('settlements').clear()
    for(const s of settlements) await tx.objectStore('settlements').add(s as any)
    await tx.objectStore('users').clear()
    for(const u of users) await tx.objectStore('users').add({ name: u } as any)
    await tx.done
  }

  const loadAll = async () => {
    const db = await getDB()
    const [loadedExpenses, loadedPersonal, loadedSettlements, loadedUsers] = await Promise.all([
      db.getAll('expenses'),
      db.getAll('personalExpenses'),
      db.getAll('settlements'),
      db.getAll('users')
    ])
    setExpenses(loadedExpenses as Expense[])
    setPersonalExpenses(loadedPersonal as PersonalExpense[])
    setSettlements(loadedSettlements as Settlement[])
    setUsers((loadedUsers as any[]).map(u => u.name))
  }

  useEffect(()=>{ loadAll() }, [])
  useEffect(()=>{ saveAll() }, [expenses, personalExpenses, settlements, users])

  // online/offline
  useEffect(()=>{
    const onOnline = ()=>setIsOnline(true)
    const onOffline = ()=>setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return ()=>{ window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  },[])

  // Rest of your component UI code... keep it minimal for now
  return (
    <div>
      <h1>BillBuddy (scaffold)</h1>
      <p>Users: {users.join(', ')}</p>
      <p>Expenses: {expenses.length}</p>
    </div>
  )
}
