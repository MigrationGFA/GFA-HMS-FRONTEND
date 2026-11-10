import { StaffCommunicationCenter } from '@/components/comms/StaffCommunicationCenter';
import { doctorClinicalNav } from '@/pages/DoctorClinicalCenter';
import { setDocPatientContext } from '@/utils/docClinicalPatientContext';
import { useNavigate } from 'react-router-dom';

/** Live staff chat — MongoDB + WebSocket via shared Communication Center. */
export const DoctorComms = () => {
  const navigate = useNavigate();
  return (
    <StaffCommunicationCenter
      module="doctor"
      navItems={doctorClinicalNav}
      shellTitle="Doctor Clinical · Communication Center"
      onOpenPatient={(ctx) => {
        if (ctx.patientName || ctx.hospitalNo) {
          setDocPatientContext({
            id: ctx.patientId || ctx.hospitalNo || 'unknown',
            name: ctx.patientName ?? 'Patient',
            hospitalId: ctx.hospitalNo ?? '—',
          });
          navigate('/dashboard/doctor/clinical/timeline');
        }
      }}
    />
  );
};

export default DoctorComms;
