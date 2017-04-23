import React from 'react'
import PropTypes from 'prop-types'
import { Container, Segment, Menu, Image, Button } from 'semantic-ui-react'
import { Link, NavLink } from 'react-router-dom'

import { getNavbarClassFromType } from '../utils'
import logo from '../logo.png'

const Navbar = (props) => {
  let {type, user, inverted} = props
  let navbarType = 'navbar'
  let children = null

  if(type) {
    navbarType = getNavbarClassFromType(type)
    children = (navbarType === 'masthead' && props.children) ? props.children : null
  }

  return (
    <Container fluid>
      <Segment basic className={navbarType}>
        <Menu inverted secondary size='large'>
            <Menu.Item header>
              <Image as={Link} to='/' size='small' src={logo}/>
            </Menu.Item>
            <Menu.Menu position='right'>
              <Menu.Item as={NavLink} to='/explore'>Explore</Menu.Item>
              <Menu.Item href='//github.com/itsyogesh/Coinbox' target='_blank'>Github</Menu.Item>
              <Menu.Item as={NavLink} to='/explore'>Sign in</Menu.Item>
              <Menu.Item>
                <Button as={Link} to='/signup' inverted>Sign up</Button>
              </Menu.Item>
            </Menu.Menu>
          </Menu>
          {children}
      </Segment>
    </Container>
  )
}

Navbar.propTypes = {
  user: PropTypes.object,
  inverted: PropTypes.bool,
  type: PropTypes.strring,
  children: PropTypes.node
}

export default Navbar
