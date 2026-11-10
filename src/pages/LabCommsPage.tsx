import { StaffCommunicationCenter } from '@/components/comms/StaffCommunicationCenter';
import { labCenterNav } from './lab/labCenterNav';

export const LabComms = () => (
  <StaffCommunicationCenter
    module="laboratory"
    navItems={labCenterNav}
    shellTitle="Laboratory · Communication Center"
  />
);

export default LabComms;
