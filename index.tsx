/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

import HomePage from './HomePage.tsx';
import CreateCoursePage from './CreateCoursePage.tsx';
import ReservationsPage from './ReservationsPage.tsx';
import StudentsPage from './StudentsPage.tsx';
import InstructorsPage from './InstructorsPage.tsx';
import FinancesPage from './FinancesPage.tsx';
import SettingsPage from './SettingsPage.tsx';
import SplashScreen from './SplashScreen.tsx';

// --- Type Definitions ---
export interface Course {
    id: string;
    name: string;
    slots: number;
    info: string;
    color: string;
    dates: string[];
    reservations: number;
    isIndividual?: boolean;
    reservationId?: string;
}

export interface Student {
    name: string;
    pesel: string;
    pkk?: string;
    phone: string;
    email: string;
    address: string;
}

export type CourseCategory = 'A' | 'B' | 'C' | 'D';

export interface Reservation {
    id: string;
    courseId: string | null;
    student: Student;
    advancePaid: boolean;
    advanceAmount: number;
    category?: CourseCategory;
    customDates?: string[];
}

export interface Instructor {
  id: string;
  name: string;
  color: string;
}

export interface ScheduleEntry {
  id: string;
  instructorId: string;
  reservationId: string;
  startTime: string; // format "HH:MM"
  endTime: string;   // format "HH:MM"
  description: string;
}

export interface CoursePrices {
    A: number;
    B: number;
    C: number;
    D: number;
}

export interface OperatingHours {
    start: string;
    end: string;
}


const INITIAL_INSTRUCTORS: Instructor[] = [
    { id: 'inst1', name: 'Jan Kowalski', color: '#ef5350' },
    { id: 'inst2', name: 'Anna Nowak', color: '#42a5f5' },
    { id: 'inst3', name: 'Piotr Wiśniewski', color: '#66bb6a' },
    { id: 'inst4', name: 'Zofia Dąbrowska', color: '#ab47bc' }
];

const INITIAL_PRICES: CoursePrices = {
    A: 2800,
    B: 3200,
    C: 4500,
    D: 6000,
};

const APP_STORAGE_KEY = 'oskMenagerData';


type Page = 'home' | 'create-course' | 'reservations' | 'students' | 'instructors' | 'finances' | 'settings';

const NAV_ITEMS: { id: Page; title: string }[] = [
    { id: 'home', title: 'Strona główna' },
    { id: 'create-course', title: 'Utwórz kurs' },
    { id: 'reservations', title: 'Rezerwacja' },
    { id: 'students', title: 'Kursanci' },
    { id: 'instructors', title: 'Instruktorzy' },
    { id: 'finances', title: 'Finanse' },
    { id: 'settings', title: 'Ustawienia' },
];

interface PageContentProps {
    currentPage: Page;
    courses: Course[];
    setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
    reservations: Reservation[];
    setReservations: React.Dispatch<React.SetStateAction<Reservation[]>>;
    instructors: Instructor[];
    setInstructors: React.Dispatch<React.SetStateAction<Instructor[]>>;
    schedule: Record<string, ScheduleEntry[]>;
    setSchedule: React.Dispatch<React.SetStateAction<Record<string, ScheduleEntry[]>>>;
    coursePrices: CoursePrices;
    setCoursePrices: React.Dispatch<React.SetStateAction<CoursePrices>>;
    appTitle: string;
    setAppTitle: React.Dispatch<React.SetStateAction<string>>;
    operatingHours: OperatingHours;
    setOperatingHours: React.Dispatch<React.SetStateAction<OperatingHours>>;
    defaultAdvanceAmount: number;
    setDefaultAdvanceAmount: React.Dispatch<React.SetStateAction<number>>;
    onExportData: () => void;
    onImportData: (file: File) => void;
}

const PageContent = ({ currentPage, courses, setCourses, reservations, setReservations, instructors, setInstructors, schedule, setSchedule, coursePrices, setCoursePrices, appTitle, setAppTitle, operatingHours, setOperatingHours, defaultAdvanceAmount, setDefaultAdvanceAmount, onExportData, onImportData }: PageContentProps) => {
    switch (currentPage) {
        case 'home': return <HomePage 
                                courses={courses}
                                reservations={reservations}
                                instructors={instructors}
                                schedule={schedule}
                                coursePrices={coursePrices}
                             />;
        case 'create-course': return <CreateCoursePage courses={courses} setCourses={setCourses} reservations={reservations} />;
        case 'reservations': return <ReservationsPage courses={courses} setCourses={setCourses} reservations={reservations} setReservations={setReservations} />;
        case 'students': return <StudentsPage reservations={reservations} courses={courses} />;
        case 'instructors': return <InstructorsPage instructors={instructors} reservations={reservations} courses={courses} schedule={schedule} setSchedule={setSchedule} />;
        case 'finances': return <FinancesPage reservations={reservations} coursePrices={coursePrices} />;
        case 'settings': return <SettingsPage 
                                    instructors={instructors} 
                                    setInstructors={setInstructors} 
                                    coursePrices={coursePrices} 
                                    setCoursePrices={setCoursePrices} 
                                    appTitle={appTitle} 
                                    setAppTitle={setAppTitle} 
                                    operatingHours={operatingHours}
                                    setOperatingHours={setOperatingHours}
                                    defaultAdvanceAmount={defaultAdvanceAmount}
                                    setDefaultAdvanceAmount={setDefaultAdvanceAmount}
                                    onExportData={onExportData}
                                    onImportData={onImportData}
                                 />;
        default: return <HomePage 
                            courses={courses}
                            reservations={reservations}
                            instructors={instructors}
                            schedule={schedule}
                            coursePrices={coursePrices}
                         />;
    }
};

const Logo = ({ title }: { title: string }) => (
    <div className="logo">
        <div className="logo-icon">L</div>
        <span className="logo-text">{title}</span>
    </div>
);

const Footer = () => (
    <footer className="app-footer">
        <p>Powered By GrzesKlep</p>
    </footer>
);


const App = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState<Page>('home');

    // --- State Initialization from localStorage ---
    const [initialState] = useState(() => {
        try {
            const serializedState = localStorage.getItem(APP_STORAGE_KEY);
            if (serializedState === null) {
                return null; // No state in localStorage, will use defaults
            }
            return JSON.parse(serializedState);
        } catch (err) {
            console.error("Could not load state from localStorage:", err);
            return null;
        }
    });

    const [courses, setCourses] = useState<Course[]>(initialState?.courses ?? []);
    const [reservations, setReservations] = useState<Reservation[]>(initialState?.reservations ?? []);
    const [instructors, setInstructors] = useState<Instructor[]>(initialState?.instructors ?? INITIAL_INSTRUCTORS);
    const [schedule, setSchedule] = useState<Record<string, ScheduleEntry[]>>(initialState?.schedule ?? {});
    const [coursePrices, setCoursePrices] = useState<CoursePrices>(initialState?.coursePrices ?? INITIAL_PRICES);
    const [appTitle, setAppTitle] = useState<string>(initialState?.appTitle ?? 'Osk Menager');
    const [operatingHours, setOperatingHours] = useState<OperatingHours>(initialState?.operatingHours ?? { start: '08:00', end: '18:00' });
    const [defaultAdvanceAmount, setDefaultAdvanceAmount] = useState(initialState?.defaultAdvanceAmount ?? 300);

    // --- State Persistence to localStorage ---
    useEffect(() => {
        try {
            const stateToPersist = {
                appTitle,
                courses,
                reservations,
                instructors,
                schedule,
                coursePrices,
                operatingHours,
                defaultAdvanceAmount,
            };
            const serializedState = JSON.stringify(stateToPersist);
            localStorage.setItem(APP_STORAGE_KEY, serializedState);
        } catch (err) {
            console.error("Could not save state to localStorage:", err);
        }
    }, [appTitle, courses, reservations, instructors, schedule, coursePrices, operatingHours, defaultAdvanceAmount]);


    const handleNavigate = (page: Page) => {
        setCurrentPage(page);
        setIsMenuOpen(false);
    };

    const handleExportData = () => {
        const allData = {
            appTitle,
            courses,
            reservations,
            instructors,
            schedule,
            coursePrices,
            operatingHours,
            defaultAdvanceAmount,
        };
        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `osk_manager_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    const handleImportData = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("File content is not a string.");
                const data = JSON.parse(text);
    
                if (window.confirm("Czy na pewno chcesz zaimportować dane? Wszystkie obecne, niezapisane dane zostaną nadpisane.")) {
                    setAppTitle(data.appTitle ?? 'Osk Menager');
                    setCourses(data.courses ?? []);
                    setReservations(data.reservations ?? []);
                    setInstructors(data.instructors ?? INITIAL_INSTRUCTORS);
                    setSchedule(data.schedule ?? {});
                    setCoursePrices(data.coursePrices ?? INITIAL_PRICES);
                    setOperatingHours(data.operatingHours ?? { start: '08:00', end: '18:00' });
                    setDefaultAdvanceAmount(data.defaultAdvanceAmount ?? 300);
                    alert("Dane zostały pomyślnie zaimportowane.");
                }
            } catch (error) {
                console.error("Błąd podczas importu:", error);
                alert("Nie udało się zaimportować danych. Upewnij się, że plik ma poprawny format.");
            }
        };
        reader.readAsText(file);
    };
    
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    if (isLoading) {
        return <SplashScreen onFinished={() => setIsLoading(false)} />;
    }

    return (
        <>
            <header className="app-header">
                <Logo title={appTitle} />
                <button className="menu-button" onClick={() => setIsMenuOpen(true)} aria-label="Otwórz menu">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </header>

            <div 
              className={`nav-overlay ${isMenuOpen ? 'visible' : ''}`}
              onClick={() => setIsMenuOpen(false)}
              aria-hidden="true"
            ></div>
            
            <nav className={`nav-menu ${isMenuOpen ? 'open' : ''}`} aria-label="Główne menu nawigacyjne">
                <div className="nav-header">
                    <Logo title={appTitle} />
                </div>
                <ul className="nav-list">
                    {NAV_ITEMS.map(item => (
                        <li key={item.id} className="nav-item">
                            <a 
                                href="#"
                                className={currentPage === item.id ? 'active' : ''}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleNavigate(item.id);
                                }}
                            >
                                {item.title}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>

            <main className="main-content">
                <PageContent 
                    currentPage={currentPage}
                    courses={courses}
                    setCourses={setCourses}
                    reservations={reservations}
                    setReservations={setReservations}
                    instructors={instructors}
                    setInstructors={setInstructors}
                    schedule={schedule}
                    setSchedule={setSchedule}
                    coursePrices={coursePrices}
                    setCoursePrices={setCoursePrices}
                    appTitle={appTitle}
                    setAppTitle={setAppTitle}
                    operatingHours={operatingHours}
                    setOperatingHours={setOperatingHours}
                    defaultAdvanceAmount={defaultAdvanceAmount}
                    setDefaultAdvanceAmount={setDefaultAdvanceAmount}
                    onExportData={handleExportData}
                    onImportData={handleImportData}
                />
            </main>
            <Footer />
        </>
    );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
