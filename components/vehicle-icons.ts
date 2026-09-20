import type {IconType} from 'react-icons';
import {FaMotorcycle,FaCarSide,FaCar,FaStar,FaCrown,FaTaxi,FaBoxOpen,FaTruckPickup,FaTruckMoving,FaTruck,FaBus,FaBusAlt,FaShuttleVan} from 'react-icons/fa';
import {MdElectricRickshaw} from 'react-icons/md';
import type {ServiceName} from '@/lib/config';
export const vehicleIcons: Record<ServiceName,IconType> = {
  'Rickshaw':MdElectricRickshaw,'Bike':FaMotorcycle,'Economy car':FaTaxi,'Comfort car':FaCarSide,'Premium car':FaStar,'Protocol car':FaCrown,
  'Parcel':FaBoxOpen,'Rickshaw loader':MdElectricRickshaw,'Suzuki pickup':FaTruckPickup,'Shehzore pickup':FaTruckPickup,'Mazda loader':FaTruckMoving,'Mini truck':FaTruckMoving,
  'Truck':FaTruck,'Luxury coach':FaBus,'Hiace van':FaShuttleVan,'Coaster':FaBusAlt,'Mini bus':FaBusAlt};
export const groupIcons: Record<string,IconType> = {Rides:FaCar,Delivery:FaBoxOpen,Loaders:FaTruckPickup,Freight:FaTruck,Buses:FaBus};
