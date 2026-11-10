import { StaffCommunicationCenter } from '@/components/comms/StaffCommunicationCenter';
import { recordsNav } from '@/pages/recordsNav';

export const RecordsComms = () => (
  <StaffCommunicationCenter
    module="records"
    navItems={recordsNav}
    shellTitle="Records · Communication Center"
  />
);

export default RecordsComms;
