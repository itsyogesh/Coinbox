import React from 'react'
import { Card, Segment, Header, Divider, Item, Icon, Label} from 'semantic-ui-react'

const PortfolioCard = () => {
  return (
    <Card fluid className='dashboard-content-card'>
      <Card.Content className='card-header'>
        <Card.Header className='card-header-heading'>
          Your Portfolio
        </Card.Header>
      </Card.Content>
      <Card.Content className='card-content portfolio'>
        <Segment basic textAlign='center'>
          <Header as='h2'>
            <span>₹</span> 191.82
            <Header.Subheader>Total Balance</Header.Subheader>
          </Header>
        </Segment>
        <Divider className='card-divider'/>
        <Item.Group relaxed>
          <Item>
            <Item.Content verticalAlign='middle'>
              <Segment basic vertical className='portfolio-item-content'>
                <Header floated='left'>Default Wallet</Header>
                <Header floated='right'>
                  0.002 BTC
                  <Header.Subheader>
                    <span>₹</span> 191.82
                  </Header.Subheader>
                </Header>
              </Segment>
            </Item.Content>
          </Item>
        </Item.Group>
      </Card.Content>
      <Card.Content extra>
        <Segment basic>
          <Header as='h3' textAlign='center'>
            <a href='#'>View your wallets <Icon name='chevron right' size='small'/></a>
          </Header>
        </Segment>
      </Card.Content>
    </Card>
  )
}

export default PortfolioCard
