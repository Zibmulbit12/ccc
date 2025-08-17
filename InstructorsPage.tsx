import React, { useState, useMemo } from 'react';
import type { Instructor, Reservation, ScheduleEntry, Course } from './index.tsx';

// --- Prop Types ---
interface InstructorsPageProps {
    instructors: Instructor[];
    reservations: Reservation[];
    courses: Course[];
    schedule: Record<string, ScheduleEntry[]>;
    setSchedule: React.Dispatch<React.SetStateAction<Record<string, ScheduleEntry[]>>>;
}

// --- Type Definitions ---
const INITIAL_ENTRY_DETAILS = {
    instructorId: '',
    startTime: '08:00',
    endTime: '10:00',
    description: '',
};

type ModalData = 
    | { type: 'new'; reservation: Reservation; date: string; }
    | { type: 'edit'; entry: ScheduleEntry; date: string; };

type ExportPeriod = 'day' | 'week' | 'month' | 'all';
type ExportFormat = 'txt' | 'doc';

// --- Component ---
const InstructorsPage = ({ instructors, reservations, courses, schedule, setSchedule }: InstructorsPageProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState<ModalData | null>(null);
    const [entryDetails, setEntryDetails] = useState(INITIAL_ENTRY_DETAILS);

    // Export state
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportInstructorId, setExportInstructorId] = useState('all');
    const [exportPeriod, setExportPeriod] = useState<ExportPeriod>('all');
    const [exportFormat, setExportFormat] = useState<ExportFormat>('txt');

    const getCourseType = (reservation: Reservation) => {
        if (reservation.customDates) return `Indywidualny - ${reservation.category}`;
        const course = courses.find(c => c.id === reservation.courseId);
        return course ? course.name : 'Brak kursu';
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString + 'T00:00:00').toLocaleDateString('pl-PL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // --- Derived Data ---
    const unscheduledItems = useMemo(() => {
        const items: { reservation: Reservation; date: string }[] = [];
        reservations.forEach(res => {
            const reservationDates = res.customDates || courses.find(c => c.id === res.courseId)?.dates || [];
            reservationDates.forEach(dateStr => {
                const dateOnly = dateStr.split('T')[0];
                const isScheduled = schedule[dateOnly]?.some(entry => entry.reservationId === res.id);
                if (!isScheduled) {
                    items.push({ reservation: res, date: dateOnly });
                }
            });
        });
        return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [reservations, courses, schedule]);

    const scheduledItems = useMemo(() => {
        const items: { entry: ScheduleEntry; date: string }[] = [];
        Object.entries(schedule).forEach(([date, entries]) => {
            entries.forEach(entry => {
                items.push({ entry, date });
            });
        });
        return items.sort((a, b) => {
            const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
            if (dateComparison !== 0) return dateComparison;
            return a.entry.startTime.localeCompare(b.entry.startTime);
        });
    }, [schedule]);

    // --- Modal Handlers ---
    const handleOpenNewModal = (reservation: Reservation, date: string) => {
        setModalData({ type: 'new', reservation, date });
        setEntryDetails({
            instructorId: instructors[0]?.id || '',
            startTime: '08:00',
            endTime: '10:00',
            description: `Jazda - ${reservation.student.name}`,
        });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (entry: ScheduleEntry, date: string) => {
        setModalData({ type: 'edit', entry, date });
        setEntryDetails({
            instructorId: entry.instructorId,
            startTime: entry.startTime,
            endTime: entry.endTime,
            description: entry.description,
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalData(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEntryDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        if (!modalData) return;

        const { date } = modalData;
        const currentEntriesOnDate = schedule[date] || [];

        if (modalData.type === 'new') {
            const newEntry: ScheduleEntry = {
                id: Date.now().toString(),
                ...entryDetails,
                reservationId: modalData.reservation.id,
            };
            setSchedule(prev => ({ ...prev, [date]: [...currentEntriesOnDate, newEntry] }));
        } else if (modalData.type === 'edit') {
            const updatedEntries = currentEntriesOnDate.map(e => 
                e.id === modalData.entry.id ? { ...e, ...entryDetails, reservationId: modalData.entry.reservationId } : e
            );
            setSchedule(prev => ({ ...prev, [date]: updatedEntries }));
        }
        closeModal();
    };

    const handleReschedule = (entryId: string, date: string) => {
         if (window.confirm('Czy na pewno chcesz cofnąć ten wpis do ponownego zaplanowania?')) {
            const updatedEntries = (schedule[date] || []).filter(entry => entry.id !== entryId);
            
            if (updatedEntries.length > 0) {
                setSchedule(prev => ({ ...prev, [date]: updatedEntries }));
            } else {
                const newSchedule = { ...schedule };
                delete newSchedule[date];
                setSchedule(newSchedule);
            }
        }
    };

    // --- Export Logic ---
    const handleExport = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const getWeek = (date: Date) => {
            const startOfWeek = new Date(date);
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            startOfWeek.setDate(diff);
            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            
            return { start: startOfWeek, end: endOfWeek };
        };

        const isDateInPeriod = (dateStr: string) => {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return false;
            
            switch(exportPeriod) {
                case 'day':
                    return date.toDateString() === today.toDateString();
                case 'week':
                    const { start, end } = getWeek(today);
                    return date >= start && date <= end;
                case 'month':
                    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
                case 'all':
                    return true;
                default:
                    return false;
            }
        };
        
        const dataToExport = scheduledItems
            .filter(({ entry }) => exportInstructorId === 'all' || entry.instructorId === exportInstructorId)
            .filter(({ date }) => isDateInPeriod(date));

        if (dataToExport.length === 0) {
            alert("Brak danych do wyeksportowania dla wybranych kryteriów.");
            return;
        }

        const instructorName = exportInstructorId === 'all'
            ? 'Wszyscy instruktorzy'
            : instructors.find(i => i.id === exportInstructorId)?.name || 'Nieznany';

        let header = `Raport grafiku\n`;
        header += `Wygenerowano: ${new Date().toLocaleString('pl-PL')}\n`;
        header += `Instruktor: ${instructorName}\n`;
        
        switch(exportPeriod) {
            case 'day': header += `Okres: ${today.toLocaleDateString('pl-PL')}\n`; break;
            case 'week': 
                const { start, end } = getWeek(today);
                header += `Okres: ${start.toLocaleDateString('pl-PL')} - ${end.toLocaleDateString('pl-PL')}\n`;
                break;
            case 'month': header += `Okres: ${today.toLocaleString('pl-PL', { month: 'long', year: 'numeric' })}\n`; break;
            case 'all': header += `Okres: Wszystkie dane\n`; break;
        }
        
        header += `Liczba wpisów: ${dataToExport.length}\n`;
        header += "========================================\n";

        const groupedByDate = dataToExport.reduce((acc, { entry, date }) => {
            if (!acc[date]) acc[date] = [];
            acc[date].push(entry);
            return acc;
        }, {} as Record<string, ScheduleEntry[]>);
        
        let content = '';
        Object.keys(groupedByDate).sort().forEach(date => {
            content += `\n--- ${formatDate(date)} ---\n`;
            groupedByDate[date].forEach(entry => {
                const studentName = reservations.find(r => r.id === entry.reservationId)?.student.name || 'Brak kursanta';
                const instName = instructors.find(i => i.id === entry.instructorId)?.name || 'Brak instruktora';
                content += `${entry.startTime} - ${entry.endTime} | Instruktor: ${instName} | Kursant: ${studentName} | Opis: ${entry.description}\n`;
            });
        });

        const fileContent = header + content;
        const mimeType = exportFormat === 'txt' ? 'text/plain' : 'application/msword';
        const filename = `grafik_${instructorName.replace(' ', '_')}_${new Date().toISOString().slice(0,10)}.${exportFormat}`;
        
        const blob = new Blob([fileContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setIsExportModalOpen(false);
    };
    
    // --- Render ---
    return (
        <div className="content-page instructors-page">
            <div className="instructors-header">
                <h1>Grafik instruktorów</h1>
                <button className="export-btn" onClick={() => setIsExportModalOpen(true)}>Eksportuj Grafik</button>
            </div>
            
            <div className="instructors-layout">
                <div className="schedule-column">
                    <h2>Zaplanuj Grafik</h2>
                    <div className="schedule-table-wrapper">
                        <div className="schedule-table-container">
                             <table className="schedule-table">
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Kursant</th>
                                        <th>Kurs/Typ</th>
                                        <th>Akcja</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {unscheduledItems.length > 0 ? (
                                        unscheduledItems.map(({ reservation, date }, index) => (
                                            <tr key={`${reservation.id}-${date}-${index}`}>
                                                <td>{formatDate(date)}</td>
                                                <td>{reservation.student.name}</td>
                                                <td>{getCourseType(reservation)}</td>
                                                <td>
                                                    <button className="btn-plan" onClick={() => handleOpenNewModal(reservation, date)}>
                                                        Zaplanuj
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={4} className="no-results-message">Wszystkie terminy są zaplanowane.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="schedule-column">
                    <h2>Grafik zaplanowany</h2>
                     <div className="schedule-table-wrapper">
                        <div className="schedule-table-container">
                            <table className="schedule-table">
                                <thead>
                                    <tr>
                                        <th>Data i Godzina</th>
                                        <th>Kursant</th>
                                        <th>Instruktor</th>
                                        <th>Akcje</th>
                                    </tr>
                                </thead>
                                <tbody>
                                     {scheduledItems.length > 0 ? (
                                        scheduledItems.map(({ entry, date }) => {
                                            const student = reservations.find(r => r.id === entry.reservationId)?.student;
                                            const instructor = instructors.find(i => i.id === entry.instructorId);
                                            return (
                                                <tr key={entry.id}>
                                                    <td>{formatDate(date)}<br/>{entry.startTime} - {entry.endTime}</td>
                                                    <td>{student?.name || 'Brak danych'}</td>
                                                    <td className="instructor-cell">
                                                        {instructor && <span className="instructor-color-dot" style={{backgroundColor: instructor.color}}></span>}
                                                        {instructor?.name || 'Nieznany'}
                                                    </td>
                                                    <td className="table-actions">
                                                        <button className="btn-edit" onClick={() => handleOpenEditModal(entry, date)}>Edytuj</button>
                                                        <button className="btn-delete" onClick={() => handleReschedule(entry.id, date)}>Cofnij</button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                         <tr><td colSpan={4} className="no-results-message">Grafik jest pusty.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {isModalOpen && modalData && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content schedule-modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>{modalData.type === 'edit' ? 'Edytuj wpis' : 'Nowy wpis w grafiku'}</h2>
                        <p className="modal-instructions">
                            Dzień: {formatDate(modalData.date)}
                            {modalData.type === 'new' && `, Kursant: ${modalData.reservation.student.name}`}
                        </p>
                        <div className="modal-form">
                            <div className="form-group">
                                <label htmlFor="instructor-select">Instruktor</label>
                                <select id="instructor-select" name="instructorId" value={entryDetails.instructorId} onChange={handleInputChange}>
                                    {instructors.map(inst => (<option key={inst.id} value={inst.id}>{inst.name}</option>))}
                                </select>
                            </div>
                            <div className="form-group form-group-inline">
                                <div><label htmlFor="start-time">Godzina od</label><input type="time" id="start-time" name="startTime" value={entryDetails.startTime} onChange={handleInputChange} /></div>
                                <div><label htmlFor="end-time">Godzina do</label><input type="time" id="end-time" name="endTime" value={entryDetails.endTime} onChange={handleInputChange} /></div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="description">Opis (np. Jazda, Egzamin)</label>
                                <textarea id="description" name="description" value={entryDetails.description} onChange={handleInputChange} required />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={closeModal}>Anuluj</button>
                            <button className="btn-confirm" onClick={handleSave}>{modalData.type === 'edit' ? 'Zapisz zmiany' : 'Dodaj wpis'}</button>
                        </div>
                    </div>
                </div>
            )}

            {isExportModalOpen && (
                <div className="modal-overlay" onClick={() => setIsExportModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Eksportuj grafik</h2>
                        <div className="modal-form">
                            <div className="form-group">
                                <label htmlFor="export-instructor">Instruktor</label>
                                <select id="export-instructor" value={exportInstructorId} onChange={(e) => setExportInstructorId(e.target.value)}>
                                    <option value="all">Wszyscy instruktorzy</option>
                                    {instructors.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
                                </select>
                            </div>
                            <div className="radio-group">
                                <p>Wybierz zakres danych:</p>
                                <div className="radio-options">
                                    <label><input type="radio" name="period" value="day" checked={exportPeriod === 'day'} onChange={() => setExportPeriod('day')} /> Dziś</label>
                                    <label><input type="radio" name="period" value="week" checked={exportPeriod === 'week'} onChange={() => setExportPeriod('week')} /> Ten tydzień</label>
                                    <label><input type="radio" name="period" value="month" checked={exportPeriod === 'month'} onChange={() => setExportPeriod('month')} /> Ten miesiąc</label>
                                    <label><input type="radio" name="period" value="all" checked={exportPeriod === 'all'} onChange={() => setExportPeriod('all')} /> Wszystkie</label>
                                </div>
                            </div>
                             <div className="radio-group">
                                <p>Wybierz format pliku:</p>
                                <div className="radio-options">
                                    <label><input type="radio" name="format" value="txt" checked={exportFormat === 'txt'} onChange={() => setExportFormat('txt')} /> .txt</label>
                                    <label><input type="radio" name="format" value="doc" checked={exportFormat === 'doc'} onChange={() => setExportFormat('doc')} /> .doc (Word)</label>
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn-cancel" onClick={() => setIsExportModalOpen(false)}>Anuluj</button>
                            <button type="button" className="btn-confirm" onClick={handleExport}>Eksportuj</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstructorsPage;