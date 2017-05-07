import React from 'react'
import { Segment, Menu } from 'semantic-ui-react'

const SecondaryNavbar = (props) => {
  return (
    <Segment basic className='secondary-nav'>
      <Menu fluid secondary size='large'>
        {props.children ? props.children : null}
      </Menu>
    </Segment>
  )
}

export default SecondaryNavbar
