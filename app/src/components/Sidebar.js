import React from 'react'
import { Menu, Segment } from 'semantic-ui-react'
import { NavLink } from 'react-router-dom'

const Sidebar = () => {
  return (
    <Segment basic className='sidebar-nav'>
      <Menu text vertical size='massive'>
        <Menu.Item as={NavLink} to='/' icon='lightning' name='Dashboard' />
        <Menu.Item as={NavLink} to='/send' icon='send outline' name='Send Money' />
        <Menu.Item as={NavLink} to='/wallets' icon='block layout' name='My Wallets' />
        <Menu.Item as={NavLink} to='/settings' icon='setting' name='Settings' />
      </Menu>
    </Segment>
  )
}

export default Sidebar
