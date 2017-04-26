import React from 'react'
import PropTypes from 'prop-types'
import { Container, Segment, Header, Menu, Statistic, Image, Button, Icon, Dropdown } from 'semantic-ui-react'
import { Link, NavLink } from 'react-router-dom'

import { getNavbarClassFromType } from '../utils'
import logo from '../logo.png'

const Navbar = (props) => {
  let {type, user, inverted} = props
  let navbarType = 'navbar'
  let children, rightNav = null

  if(type) {
    navbarType = getNavbarClassFromType(type)
    children = (navbarType === 'masthead' && props.children) ? props.children : null
  }

  if (user) {
    rightNav = (
      <Menu.Menu position='right'>
        <Menu.Item href='//github.com/itsyogesh/Coinbox' target='_blank'>Github</Menu.Item>
        <Dropdown text='Yogesh Kumar' className='link item'>
          <Dropdown.Menu>
            <Dropdown.Header className='user-dropdown'>
              <Header as='h3'>Yogesh Kumar</Header>
              <p>yogesh@projectwise.in</p>
            </Dropdown.Header>
            <Dropdown.Divider />
            <Dropdown.Item icon='users' text='Invite Friends'/>
            <Dropdown.Item icon='setting' text='Account Settings' />
            <Dropdown.Item icon='power' text='Logout' />
          </Dropdown.Menu>
        </Dropdown>
      </Menu.Menu>
    )
  } else {
    rightNav = (
      <Menu.Menu position='right'>
        <Menu.Item as={NavLink} to='/explore'>Explore</Menu.Item>
        <Menu.Item href='//github.com/itsyogesh/Coinbox' target='_blank'>Github</Menu.Item>
        <Menu.Item as={NavLink} to='/login'>Sign in</Menu.Item>
        <Menu.Item>
          <Button as={Link} to='/signup' inverted>Sign up</Button>
        </Menu.Item>
      </Menu.Menu>
    )
  }

  return (
    <Container fluid>
      <Segment basic className={navbarType}>
        <Menu inverted secondary size='large'>
            <Menu.Item header>
              <Image as={Link} to='/' size='small' src={logo}/>
            </Menu.Item>
            {rightNav}
          </Menu>
          {children}
      </Segment>
    </Container>
  )
}

Navbar.propTypes = {
  user: PropTypes.object,
  inverted: PropTypes.bool,
  type: PropTypes.string,
  children: PropTypes.node
}

export default Navbar
