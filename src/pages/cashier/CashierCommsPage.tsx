import { StaffCommunicationCenter } from '@/components/comms/StaffCommunicationCenter';
import { cashierNav } from '@/pages/CashierCenter';

export const CashierComms = () => (
  <StaffCommunicationCenter
    module="cashier"
    navItems={cashierNav}
    shellTitle="Cashier · Communication Center"
  />
);

export default CashierComms;
