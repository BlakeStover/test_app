// Hardcoded request templates per wizard category.
// Each template sets title + description in wizard state when tapped.

export const TEMPLATES = {
  lockout: [
    {
      id: 'lockout_room',
      title: 'Locked out of my room',
      subtitle: 'Need access to my dorm room',
      description: 'I am locked out of my dorm room and need assistance gaining access.',
    },
    {
      id: 'lockout_card',
      title: 'Key card not working',
      subtitle: 'Student ID won\'t open the door',
      description: 'My student ID card is not opening the building or room entry door.',
    },
    {
      id: 'lockout_key',
      title: 'Lost room key',
      subtitle: 'Need a replacement key',
      description: 'I have lost my room key and need a replacement issued.',
    },
    {
      id: 'lockout_broken',
      title: 'Door lock is broken',
      subtitle: 'Lock mechanism not functioning',
      description: 'The lock on my door is broken and not functioning properly.',
    },
  ],
  maintenance: [
    {
      id: 'maint_furniture',
      title: 'Broken furniture or fixture',
      subtitle: 'Bed, desk, chair, or other item',
      description: 'A piece of furniture or fixture in my room is broken and needs repair or replacement.',
    },
    {
      id: 'maint_window',
      title: 'Window or door not closing',
      subtitle: 'Won\'t latch or seal properly',
      description: 'A window or door in my room will not close or latch properly.',
    },
    {
      id: 'maint_ceiling',
      title: 'Ceiling or wall damage',
      subtitle: 'Crack, hole, or water stain',
      description: 'There is damage to the ceiling or walls in my room that needs attention.',
    },
    {
      id: 'maint_floor',
      title: 'Floor damage',
      subtitle: 'Damaged tile, carpet, or surface',
      description: 'There is damage to the flooring in my room or a common area.',
    },
  ],
  electrical: [
    {
      id: 'elec_outlet',
      title: 'Outlet not working',
      subtitle: 'No power from wall outlet',
      description: 'One or more electrical outlets in my room are not functioning.',
    },
    {
      id: 'elec_light',
      title: 'Light fixture out',
      subtitle: 'Overhead or bathroom light',
      description: 'A light fixture in my room or common area is not working.',
    },
    {
      id: 'elec_breaker',
      title: 'Power out in room',
      subtitle: 'Possible tripped circuit breaker',
      description: 'Power in part of my room or the hallway has gone out, possibly a tripped breaker.',
    },
    {
      id: 'elec_hvac',
      title: 'Heating or cooling not working',
      subtitle: 'HVAC system issue',
      description: 'The heating or air conditioning in my room is not functioning properly.',
    },
  ],
  plumbing: [
    {
      id: 'plumb_leak',
      title: 'Leaking faucet or pipe',
      subtitle: 'Dripping or water pooling',
      description: 'There is a leaking faucet or pipe in my room or bathroom.',
    },
    {
      id: 'plumb_drain',
      title: 'Slow or clogged drain',
      subtitle: 'Sink, shower, or toilet',
      description: 'The sink, shower, or toilet drain is slow or completely clogged.',
    },
    {
      id: 'plumb_toilet',
      title: 'Toilet not flushing',
      subtitle: 'Running or won\'t flush',
      description: 'The toilet in my bathroom is not flushing properly or is running continuously.',
    },
    {
      id: 'plumb_water',
      title: 'No hot water',
      subtitle: 'Only cold water available',
      description: 'There is no hot water available in my room or bathroom.',
    },
  ],
  pest: [
    {
      id: 'pest_roaches',
      title: 'Cockroach sighting',
      subtitle: 'One or more cockroaches seen',
      description: 'I have seen cockroaches in my room or common area and need pest control.',
    },
    {
      id: 'pest_mice',
      title: 'Mouse or rodent sighting',
      subtitle: 'Rodent seen or evidence found',
      description: 'I have seen a mouse or other rodent, or found evidence of one, in my room or common area.',
    },
    {
      id: 'pest_ants',
      title: 'Ant infestation',
      subtitle: 'Ants in room or kitchen area',
      description: 'There are ants in my room or kitchen area that need to be addressed.',
    },
    {
      id: 'pest_other',
      title: 'Other pest issue',
      subtitle: 'Describe what you\'ve spotted',
      description: 'I have spotted other pests in my room or common area that need attention.',
    },
  ],
};

// Maps wizard category id → DB enum value
export const CATEGORY_DB_MAP = {
  lockout: 'campus_safety',
  maintenance: 'maintenance',
  electrical: 'maintenance',
  plumbing: 'maintenance',
  pest: 'cleaning',
  emergency: 'campus_safety',
};

// Fallback title when user writes a custom description with no template selected
export const CATEGORY_DEFAULT_TITLE = {
  lockout: 'Access / Lockout Request',
  maintenance: 'Maintenance Request',
  electrical: 'Electrical Issue',
  plumbing: 'Plumbing Issue',
  pest: 'Pest Control Request',
};

// Human-readable label for the confirm screen
export const CATEGORY_LABEL = {
  lockout: 'Lockout / Access',
  maintenance: 'Maintenance',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  pest: 'Pest Control',
};
