import React, { useState, useMemo } from 'react';
import type { Reservation, Course } from './index.tsx';

interface StudentsPageProps {
    reservations: Reservation[];
    courses: Course[];
}

type ExportPeriod = 'day' | 'week' | 'month' | 'all';
type ExportFormat = 'txt' | 'doc';

const StudentsPage = ({ reservations, courses }: StudentsPageProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportPeriod, setExportPeriod] = useState<ExportPeriod>('all');
    const [exportFormat, setExportFormat] = useState<ExportFormat>('txt');

    const filteredReservations = useMemo(() => {
        if (!searchTerm) return reservations;
        
        const lowercasedFilter = searchTerm.toLowerCase();
        
        return reservations.filter(reservation => {
            const student = reservation.student;
            return (
                student.name.toLowerCase().includes(lowercasedFilter) ||
                student.pesel.toLowerCase().includes(lowercasedFilter) ||
                (student.pkk && student.pkk.toLowerCase().includes(lowercasedFilter)) ||
                student.phone.toLowerCase().includes(lowercasedFilter) ||
                student.email.toLowerCase().includes(lowercasedFilter)
            );
        });
    }, [searchTerm, reservations]);

    const getCourseNameById = (courseId: string | null) => {
        const course = courseId ? courses.find(c => c.id === courseId) : null;
        return course ? course.name : 'Nie przypisano';
    };
    
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const getCourseTerm = (courseId: string | null) => {
        if (!courseId) return 'Brak';
        const course = courses.find(c => c.id === courseId);
        if (!course || course.dates.length === 0) return 'Brak dat';
        
        const sortedDates = course.dates.map(d => new Date(d)).sort((a,b) => a.getTime() - b.getTime());
        const startDate = sortedDates[0];
        const endDate = sortedDates[sortedDates.length - 1];

        return startDate.getTime() === endDate.getTime() 
            ? formatDate(startDate) 
            : `${formatDate(startDate)} - ${formatDate(endDate)}`;
    };
    
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
        
        const dataToExport = reservations.filter(res => {
            const reservationDates = res.customDates 
                ? res.customDates 
                : courses.find(c => c.id === res.courseId)?.dates || [];
            
            return reservationDates.some(isDateInPeriod);
        });

        if (dataToExport.length === 0) {
            alert("Brak danych do wyeksportowania dla wybranego okresu.");
            return;
        }

        const formatReservation = (res: Reservation): string => {
            const student = res.student;
            const courseName = res.customDates 
                ? `Indywidualny - ${res.category}` 
                : getCourseNameById(res.courseId);
            
            return [
                `Imię i nazwisko: ${student.name}`,
                `Nr telefonu: ${student.phone}`,
                `Email: ${student.email || 'Brak'}`,
                `PESEL: ${student.pesel || 'Brak'}`,
                `PKK: ${student.pkk || 'Brak'}`,
                `Adres: ${student.address || 'Brak'}`,
                ``,
                `Kurs: ${courseName}`,
                `Kategoria: ${res.category || 'Brak'}`,
                `Zaliczka: ${res.advancePaid ? `Zapłacono (${res.advanceAmount} zł)` : 'Nie zapłacono'}`
            ].join('\n');
        };

        let header = `Raport kursantów\n`;
        header += `Wygenerowano: ${new Date().toLocaleString('pl-PL')}\n`;
        
        switch(exportPeriod) {
            case 'day': header += `Okres: ${today.toLocaleDateString('pl-PL')}\n`; break;
            case 'week': 
                const { start, end } = getWeek(today);
                header += `Okres: ${start.toLocaleDateString('pl-PL')} - ${end.toLocaleDateString('pl-PL')}\n`;
                break;
            case 'month': header += `Okres: ${today.toLocaleString('pl-PL', { month: 'long', year: 'numeric' })}\n`; break;
            case 'all': header += `Okres: Wszystkie dane\n`; break;
        }
        
        header += `Liczba rezerwacji: ${dataToExport.length}\n`;
        header += "========================================\n\n";

        const fileContent = header + dataToExport.map(formatReservation).join('\n\n----------------------------------------\n\n');

        const mimeType = exportFormat === 'txt' ? 'text/plain' : 'application/msword';
        const filename = `eksport_kursantow_${new Date().toISOString().slice(0,10)}.${exportFormat}`;
        
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

    return (
        <div className="content-page">
            <h1>Kursanci</h1>
            <div className="students-header">
                <div className="search-container">
                    <input 
                        type="text" 
                        placeholder="Szukaj kursantów (imię, nazwisko, pesel, pkk...)" 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        aria-label="Wyszukiwarka kursantów"
                    />
                </div>
                <button className="export-btn" onClick={() => setIsExportModalOpen(true)}>Exportuj dane</button>
            </div>

            <div className="students-card">
                <div className="students-table-container">
                    <table className="students-table">
                        <thead>
                            <tr>
                                <th>Imię i nazwisko</th>
                                <th>Kurs</th>
                                <th>Nr telefonu</th>
                                <th>Status zaliczki</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReservations.length > 0 ? (
                                filteredReservations.map(reservation => (
                                    <tr key={reservation.id}>
                                        <td>
                                            <a href="#" onClick={(e) => { e.preventDefault(); setSelectedReservation(reservation); }}>
                                                {reservation.student.name}
                                            </a>
                                        </td>
                                        <td>{reservation.customDates ? `Indywidualny - ${reservation.category}` : getCourseNameById(reservation.courseId)}</td>
                                        <td>{reservation.student.phone}</td>
                                        <td>
                                            {reservation.advancePaid ? (
                                                <span className="status-badge status-paid">Zapłacono</span>
                                            ) : (
                                                <span className="status-badge status-unpaid">Nie zapłacono</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="no-results-message">
                                        {searchTerm ? 'Nie znaleziono kursantów pasujących do kryteriów.' : 'Brak zarezerwowanych kursantów.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedReservation && (
                <div className="modal-overlay" onClick={() => setSelectedReservation(null)}>
                    <div className="modal-content student-details-modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Szczegóły rezerwacji</h2>
                        <p><strong>Imię i nazwisko:</strong> {selectedReservation.student.name}</p>
                        <p><strong>Nr PESEL:</strong> {selectedReservation.student.pesel || 'Brak'}</p>
                        <p><strong>Nr PKK:</strong> {selectedReservation.student.pkk || 'Brak'}</p>
                        <p><strong>Nr telefonu:</strong> {selectedReservation.student.phone}</p>
                        <p><strong>Adres e-mail:</strong> {selectedReservation.student.email || 'Brak'}</p>
                        <p><strong>Adres:</strong> {selectedReservation.student.address || 'Brak'}</p>
                        <hr />
                        {selectedReservation.customDates && selectedReservation.customDates.length > 0 ? (
                            <>
                                <p><strong>Typ rezerwacji:</strong> Indywidualna</p>
                                <p><strong>Terminy indywidualne:</strong> {selectedReservation.customDates.map(d => formatDate(new Date(d))).join(', ')}</p>
                            </>
                        ) : (
                            <>
                                <p><strong>Kurs:</strong> {getCourseNameById(selectedReservation.courseId)}</p>
                                <p><strong>Termin kursu:</strong> {getCourseTerm(selectedReservation.courseId)}</p>
                            </>
                        )}
                        <p><strong>Kategoria:</strong> {selectedReservation.category || 'Brak'}</p>
                        <p>
                            <strong>Zaliczka:</strong> 
                            {selectedReservation.advancePaid 
                                ? ` Zapłacono (${selectedReservation.advanceAmount} zł)` 
                                : ' Nie zapłacono'}
                        </p>
                        <div className="modal-actions">
                            <button type="button" className="btn-cancel" onClick={() => setSelectedReservation(null)}>Zamknij</button>
                        </div>
                    </div>
                </div>
            )}
            
            {isExportModalOpen && (
                <div className="modal-overlay" onClick={() => setIsExportModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Eksportuj dane kursantów</h2>
                        <div className="modal-form">
                            <div className="radio-group">
                                <p>Wybierz zakres danych:</p>
                                <div className="radio-options">
                                    <label>
                                        <input type="radio" name="period" value="day" checked={exportPeriod === 'day'} onChange={() => setExportPeriod('day')} />
                                        Dziś
                                    </label>
                                    <label>
                                        <input type="radio" name="period" value="week" checked={exportPeriod === 'week'} onChange={() => setExportPeriod('week')} />
                                        Ten tydzień
                                    </label>
                                    <label>
                                        <input type="radio" name="period" value="month" checked={exportPeriod === 'month'} onChange={() => setExportPeriod('month')} />
                                        Ten miesiąc
                                    </label>
                                    <label>
                                        <input type="radio" name="period" value="all" checked={exportPeriod === 'all'} onChange={() => setExportPeriod('all')} />
                                        Wszystkie
                                    </label>
                                </div>
                            </div>
                             <div className="radio-group">
                                <p>Wybierz format pliku:</p>
                                <div className="radio-options">
                                    <label>
                                        <input type="radio" name="format" value="txt" checked={exportFormat === 'txt'} onChange={() => setExportFormat('txt')} />
                                        .txt
                                    </label>
                                    <label>
                                        <input type="radio" name="format" value="doc" checked={exportFormat === 'doc'} onChange={() => setExportFormat('doc')} />
                                        .doc (Word)
                                    </label>
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

export default StudentsPage;