import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../logic/AuthContext';
import { EmployeeContext } from '../logic/EmployeeContext';
import { db } from '../firebase/firebase';
import { doc, getDoc, getDocs, query, where, collection } from 'firebase/firestore';

const Profile = () => {
  const context = useContext(AuthContext);
  const { employees } = useContext(EmployeeContext);
  const navigate = useNavigate();
  const [userRecord, setUserRecord] = useState<any | null>(null);
  const handleEdit = () => {
    if (employee) {
      navigate('/addemployee', { state: { employee, allowSelfEdit: true } });
    } else {
      navigate('/addemployee', { state: { allowSelfEdit: true } });
    }
  };
  const employee = useMemo(() => {
    if (!context?.currentUser) return null;
    const displayName = context.currentUser.displayName || '';
    const email = context.currentUser.email || '';
    const dn = displayName.trim();
    if (dn) {
      const byFull = employees.find(e => (e.fullname || '').toLowerCase() === dn.toLowerCase());
      if (byFull) return byFull;
      const parts = dn.split(/\s+/);
      if (parts.length >= 2) {
        const first = parts[0].toLowerCase();
        const last = parts[parts.length - 1].toLowerCase();
        const byNames = employees.find(e => (e.name?.first || '').toLowerCase() === first && (e.name?.last || '').toLowerCase() === last);
        if (byNames) return byNames;
      }
    }
    const byEmail = employees.find((e: any) => typeof e.email === 'string' && e.email.toLowerCase() === email.toLowerCase());
    return byEmail || null;
  }, [context?.currentUser, employees]);

  // Load the Firestore user document for this auth user (if present)
  useEffect(() => {
    let cancelled = false;
    async function loadUserDoc() {
      if (!context?.currentUser) { setUserRecord(null); return; }
      try {
        // Try users/{uid}
        const uid = (context.currentUser as any).uid as string;
        const byUidRef = doc(db, 'users', uid);
        const byUidSnap = await getDoc(byUidRef);
        if (byUidSnap.exists()) {
          if (!cancelled) setUserRecord({ id: byUidSnap.id, ...byUidSnap.data() });
          return;
        }
        // Fallback by email
        const email = context.currentUser.email;
        if (email) {
          const q = query(collection(db, 'users'), where('email', '==', email));
          const qs = await getDocs(q);
          const match = qs.docs[0];
          if (match) {
            if (!cancelled) setUserRecord({ id: match.id, ...match.data() });
            return;
          }
        }
        if (!cancelled) setUserRecord(null);
      } catch {
        if (!cancelled) setUserRecord(null);
      }
    }
    loadUserDoc();
    return () => { cancelled = true; };
  }, [context?.currentUser]);

  return (
    <div className="container mx-auto mt-10">
      <h2 className="mb-6 text-2xl font-semibold">Hello {context?.currentUser?.displayName || context?.currentUser?.email}</h2>

      {employee ? (
        <>
        <div className="mb-4">
          <button
            onClick={handleEdit}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            style={{ marginBottom: '2em' }}
          >
            Edit My Profile
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 border rounded">
            <h3 className="font-semibold mb-2">Basic Info</h3>
            <p><strong>Name:</strong> {employee.fullname || `${employee.name?.first || ''} ${employee.name?.last || ''}`}</p>
            <p><strong>Clearance:</strong> {employee.clearanceLevel || 'No data available'}</p>
          </div>

          <div className="p-4 border rounded">
            <h3 className="font-semibold mb-2">Skills</h3>
            {employee.skills && employee.skills.length > 0 ? (
              <ul className="list-disc ml-5">
                {employee.skills.map((s, i) => (
                  <li key={i}>{s.skill} {typeof s.yearsExperience === 'number' ? `(${s.yearsExperience} yrs)` : ''}{s.proficiency ? ` – ${s.proficiency}` : ''}</li>
                ))}
              </ul>
            ) : (
              <p>No data available</p>
            )}
          </div>

          <div className="p-4 border rounded">
            <h3 className="font-semibold mb-2">Certifications</h3>
            {employee.certifications && employee.certifications.length > 0 ? (
              <ul className="list-disc ml-5">
                {employee.certifications.map((c, i) => (
                  <li key={i}>{c.name}{c.issuedBy ? ` – ${c.issuedBy}` : ''}</li>
                ))}
              </ul>
            ) : (
              <p>No data available</p>
            )}
          </div>

          <div className="p-4 border rounded">
            <h3 className="font-semibold mb-2">Education</h3>
            {employee.education && employee.education.length > 0 ? (
              <ul className="list-disc ml-5">
                {employee.education.map((e, i) => (
                  <li key={i}>{e.degree}{e.fieldOfStudy ? ` – ${e.fieldOfStudy}` : ''}{e.institution ? ` @ ${e.institution}` : ''}</li>
                ))}
              </ul>
            ) : (
              <p>No data available</p>
            )}
          </div>

          <div className="p-4 border rounded md:col-span-2">
            <h3 className="font-semibold mb-2">Other Training</h3>
            {(employee as any).otherTrainings && (employee as any).otherTrainings.length > 0 ? (
              <ul className="list-disc ml-5">
                {(employee as any).otherTrainings.map((t: string, i: number) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            ) : (
              <p>No data available</p>
            )}
          </div>
        </div>
        </>
      ) : (
        <div className="p-6 border rounded">
          <h3 className="font-semibold mb-2">No employee record found</h3>
          <p>We could not find an employee profile associated with your account. If you believe this is a mistake, please contact an administrator.</p>
          <div className="mt-4">
            <button
              onClick={handleEdit}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              style={{ marginBottom: '2em' }}
            >
              Create My Profile
            </button>
          </div>
        </div>
      )}
      <hr className="my-6" />
      <div className="p-4 border rounded">
        <h3 className="font-semibold mb-2">Account Record</h3>
        {userRecord ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <p><strong>UID:</strong> {userRecord.uid || userRecord.id || '—'}</p>
            <p><strong>Email:</strong> {userRecord.email || '—'}</p>
            <p><strong>Name:</strong> {userRecord.displayName || '—'}</p>
            <p><strong>Phone:</strong> {userRecord.phoneNumber || '—'}</p>
            {Array.isArray((userRecord as any).roles) && (userRecord as any).roles.length > 0 ? (
              <p><strong>Roles:</strong> {(userRecord as any).roles.join(', ')}</p>
            ) : ( (userRecord as any).role ? (
              <p><strong>Roles:</strong> {(userRecord as any).role}</p>
            ) : ((userRecord as any).isAdmin ? (
              <p><strong>Roles:</strong> admin</p>
            ) : null))}
            {typeof userRecord.disabled !== 'undefined' && (
              <p><strong>Active:</strong> {userRecord.disabled ? 'Yes' : 'No'}</p>
            )}
          </div>
        ) : (
          <p>No data available</p>
        )}
      </div>
		<br/>
      
    </div>
  );
};

export default Profile;
